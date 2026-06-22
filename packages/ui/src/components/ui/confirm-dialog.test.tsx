import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './confirm-dialog';

function Harness({ onResult }: { onResult: (r: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        const ok = await confirm({ title: 'Archive product?', tone: 'danger', confirmLabel: 'Archive' });
        onResult(ok);
      }}
    >
      open
    </button>
  );
}

describe('useConfirm', () => {
  it('resolves true when confirmed', async () => {
    let result: boolean | undefined;
    render(
      <ConfirmProvider>
        <Harness onResult={(r) => (result = r)} />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByText('open'));
    expect(screen.getByText('Archive product?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(result).toBe(true);
  });

  it('resolves false when cancelled', async () => {
    let result: boolean | undefined;
    render(
      <ConfirmProvider>
        <Harness onResult={(r) => (result = r)} />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByText('open'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(result).toBe(false);
  });
});
