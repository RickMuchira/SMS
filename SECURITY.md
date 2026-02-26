# Security Enhancements

## Phone-Based Password Security

Student accounts use guardian phone numbers as passwords for easy parent access. To mitigate weak password risks:

### 1. Two-Factor Authentication (2FA)

Laravel Fortify 2FA is already installed. To require 2FA for student/parent accounts:

**Enable in config/fortify.php:**
```php
Features::twoFactorAuthentication([
    'confirm' => true,
    'confirmPassword' => true,
]),
```

**Enforce 2FA for students:**

Add to `app/Http/Middleware/Ensure TwoFactorEnabled.php`:

```php
public function handle($request, Closure $next)
{
    $user = $request->user();
    
    if ($user && $user->hasRole('student') && !$user->two_factor_secret) {
        return redirect()->route('two-factor.enable')
            ->with('warning', 'Please enable 2FA to secure your account.');
    }
    
    return $next($request);
}
```

### 2. Password Strength Requirements

For non-student accounts, enforce strong passwords:

**In User creation forms:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- Password strength meter (use `zxcvbn` library)

### 3. Account Lockout

Implement after N failed login attempts (already built into Laravel).

### 4. Session Security

- Short session timeouts for student accounts
- IP-based session validation
- Device fingerprinting

## Super Admin Protection

Only `super@gmail.com` can:
- Assign super-admin role to other users
- Access system settings (`/admin/settings`)
- Modify or delete the primary super admin account

This is enforced at:
- Middleware level (`EnsureSuperAdmin`)
- Controller level (`AdminUserController`)
- Route level (settings routes)

## Implementation Status

- ✅ Phone-based passwords for students
- ✅ Password visibility toggle
- ✅ Super admin protection
- ✅ System settings (email format, branding)
- ⚠️ 2FA: Available but not enforced (needs manual enablement)
- ⚠️ Password strength: Basic validation only

## Recommended Next Steps

1. Enable Fortify 2FA in config
2. Create middleware to enforce 2FA for students
3. Add password strength requirements for admin accounts
4. Implement account lockout policy
5. Add audit logging for admin actions
