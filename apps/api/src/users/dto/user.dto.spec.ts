import { UserDto } from './user.dto';
import { SafeUser } from '../users.select';

// Compile-time guard: UserDto must be structurally interchangeable with SafeUser.
// If users.select.ts drifts from UserDto, `npm run typecheck`/this file fails to compile.
describe('UserDto', () => {
  it('is structurally compatible with SafeUser', () => {
    const fromSafe: UserDto = {} as SafeUser;
    const toSafe: SafeUser = {} as UserDto;
    expect(fromSafe).toBeDefined();
    expect(toSafe).toBeDefined();
  });
});
