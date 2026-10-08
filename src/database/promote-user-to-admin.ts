import 'dotenv/config';
import dataSource from './data-source';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';

async function promoteUserToAdmin() {
  const emailArgument = process.argv.find((argument) =>
    argument.startsWith('--email='),
  );
  const email = emailArgument?.slice('--email='.length).trim().toLowerCase();
  if (!email) {
    throw new Error('Usage: npm run admin:promote -- --email=user@example.com');
  }

  await dataSource.initialize();
  try {
    const result = await dataSource
      .getRepository(User)
      .update({ email }, { role: UserRole.ADMIN });
    if (result.affected !== 1) {
      throw new Error(`No account found for ${email}; register it first.`);
    }
    console.info(`Promoted ${email} to ${UserRole.ADMIN}.`);
  } finally {
    await dataSource.destroy();
  }
}

promoteUserToAdmin().catch((error: unknown) => {
  console.error('Could not promote user to admin:', error);
  process.exitCode = 1;
});
