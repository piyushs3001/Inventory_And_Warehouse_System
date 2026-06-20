import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer');

function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('MailService', () => {
  afterEach(() => jest.clearAllMocks());

  it('isConfigured() is false when SMTP_HOST/USER/PASS are missing', () => {
    const service = new MailService(makeConfig({}));
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured() is true when host, user and pass are all present', () => {
    const service = new MailService(
      makeConfig({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'u@example.com',
        SMTP_PASS: 'secret',
      }),
    );
    expect(service.isConfigured()).toBe(true);
  });

  it('does not throw and sends nothing when SMTP is not configured', async () => {
    const service = new MailService(makeConfig({}));
    await expect(
      service.sendPasswordReset('to@example.com', 'http://x/reset?token=abc'),
    ).resolves.toBeUndefined();
    expect(nodemailer.createTransport as jest.Mock).not.toHaveBeenCalled();
  });

  it('sends an email containing the reset URL when configured', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = new MailService(
      makeConfig({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 465,
        SMTP_USER: 'u@example.com',
        SMTP_PASS: 'secret',
        MAIL_FROM: 'IWS <u@example.com>',
      }),
    );

    await service.sendPasswordReset(
      'to@example.com',
      'http://staff/reset-password?token=abc123',
    );

    expect(nodemailer.createTransport as jest.Mock).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const calls = sendMail.mock.calls as Array<
      [{ to: string; from: string; html: string; text: string }]
    >;
    const arg = calls[0][0];
    expect(arg.to).toBe('to@example.com');
    expect(arg.from).toBe('IWS <u@example.com>');
    expect(arg.html).toContain('http://staff/reset-password?token=abc123');
    expect(arg.text).toContain('http://staff/reset-password?token=abc123');
  });
});
