# Staff Module Quick Reference Guide

## Login Credentials for All Staff

All staff members can log in using their auto-generated credentials:

### Login Format
- **Username**: First two names in lowercase, separated by dot
- **Password**: Mobile number in 07 format (no spaces, no +254)

### Examples

| Full Name | Username | Password | Role |
|-----------|----------|----------|------|
| Mwangi Joseph Kariuki | mwangi.joseph | 0704239729 | Manager |
| Arvidiza Christine | arvidiza.christine | 0795086819 | Secretary |
| Michael Ngugi Wairimu | michael.ngugi | 0769748494 | Driver |
| Dennis Thiga Mwaniki | dennis.thiga | 0716890860 | Driver |
| Felix Kabui Kamau | felix.kabui | 0726954089 | Driver |
| Marha Wambui Ngugi | marha.wambui | 0724136378 | Chef |
| Tom Omueri Nyakundi | tom.omueri | 0725669361 | Chef |
| Elizabeth Wairimu Kiarie | elizabeth.wairimu | 0707784482 | Cleaner |
| Simon Waweru Kamau | simon.waweru | 0115408756 | Cleaner |
| Jane Wanjiru Muthinga | jane.wanjiru | 0727085201 | Cleaner |
| Felister Munywa Kyania | felister.munywa | 0722350510 | Teacher |
| Niva Nabifwo Watitwa | niva.nabifwo | 0757535936 | Teacher |
| Jean Paul Fabrice Ubunyanja | jean.paul | 0116353999 | Teacher |
| Mary Wanjiru Migwi | mary.wanjiru | 0796541809 | Teacher |
| Catherine Wairimu Kamotho | catherine.wairimu | 0719794382 | Teacher |
| Lydiah Wanjiru Munene | lydiah.wanjiru | 0724761819 | Teacher |
| Jane Nyambura Kiarie | jane.nyambura | 0720866049 | Teacher |
| Mwangi Jackson Ndirangu | mwangi.jackson | 0711406541 | Teacher |
| Tabitha Wangui Maina | tabitha.wangui | 0102937190 | Teacher |
| Janepher Nanyama Wamalwa | janepher.nanyama | 0113001506 | Teacher |
| Wiliam Mutua Benard | wiliam.mutua | 0111775463 | Teacher |
| Alice Wanjiru Kimani | alice.wanjiru | 0710189867 | Teacher |
| Willy Mwangi Kimani | willy.mwangi | 0726114863 | Teacher |
| Immaculate Ikedi | immaculate.ikedi | 0748471599 | Teacher |
| Marha Wairimu Njoroge | marha.wairimu | 0796472814 | Teacher |

## Accessing the Staff Module

### For Admin Users

1. **Login**: Navigate to `/admin/login`
2. **Access Staff Profiles**: Go to `Staff & Teachers` → `Staff Profiles` in sidebar
3. **Direct URL**: `/admin/staff/profiles`

### Permissions Required
- **View**: `view staff` permission
- **Create/Edit/Delete**: `manage staff` permission

## Adding New Staff

### Via Web Interface

1. Navigate to **Staff Profiles** page
2. Click **"Add Staff Member"** button
3. Fill in required fields:
   - Full Name *
   - Mobile Number * (format: +254 XXX XXX XXX)
   - Job Title
   - Department
   - Employment Type * (full-time, part-time, contract)
   - Employment Status * (active, suspended, terminated)
   - Gross Monthly Salary *

4. System automatically creates:
   - Username (first two names)
   - Password (mobile in 07 format)
   - Email (username@staff.local)
   - Employee ID (EMP00001, EMP00002, etc.)

### Via API

**Endpoint**: `POST /api/staff`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-CSRF-TOKEN": "<csrf_token>"
}
```

**Body**:
```json
{
  "name": "John Doe Smith",
  "phone_number": "+254 712 345 678",
  "job_title": "Teacher",
  "department_id": 2,
  "employment_type": "full-time",
  "employment_status": "active",
  "gross_monthly_salary": 50000,
  "tsc_number": "123456",
  "kra_pin": "A012345678X",
  "nssf_number": "1234567890",
  "sha_shif_number": "CR1234567890123-4"
}
```

**Response**:
```json
{
  "data": {
    "id": 26,
    "employee_id": "EMP00026",
    "user": {
      "id": 27,
      "name": "john.doe",
      "email": "john.doe@staff.local"
    }
  }
}
```

## Searching and Filtering

### Search Bar
Search by:
- Name
- Employee ID
- Job Title
- Mobile Number

### Filters
- **Department**: Filter by staff department
- **Employment Status**: active, suspended, terminated

## Staff Departments

| Code | Name | Description |
|------|------|-------------|
| ADMIN | Administration | Managers, secretaries, office staff |
| TEACH | Teaching Staff | Teachers and academic staff |
| FIN | Finance | Finance and accounting department |
| IT | IT Department | IT and systems staff |
| SUPP | Support Staff | Cleaners, security, maintenance |
| TRANS | Transport | Drivers and coordinators |

## Testing Staff Login

### Method 1: Browser
1. Open browser to `/admin/login`
2. Enter username: `mwangi.joseph`
3. Enter password: `0704239729`
4. Click "Sign In"

### Method 2: Tinker
```bash
php artisan tinker --execute="
echo Hash::check('0704239729', App\Models\User::where('name', 'mwangi.joseph')->first()->password) ? 'Password correct!' : 'Password wrong';
"
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/staff` | view staff | List all staff (paginated) |
| POST | `/api/staff` | manage staff | Create new staff |
| GET | `/api/staff/{id}` | view staff | Get staff details |
| PUT/PATCH | `/api/staff/{id}` | manage staff | Update staff |
| DELETE | `/api/staff/{id}` | manage staff | Delete staff |
| GET | `/api/departments` | (any) | List departments |

## Database Commands

### View all staff
```bash
php artisan tinker --execute="
App\Models\StaffProfile::with('user')->get()->each(function(\$s) {
    echo \$s->employee_id . ' | ' . \$s->user->name . ' | ' . \$s->job_title . PHP_EOL;
});
"
```

### Count by department
```bash
php artisan tinker --execute="
App\Models\StaffProfile::with('department')->get()->groupBy('department.name')->map(function(\$items) {
    return \$items->count();
})->each(function(\$count, \$dept) {
    echo \$dept . ': ' . \$count . PHP_EOL;
});
"
```

### Find staff by name
```bash
php artisan tinker --execute="
\$staff = App\Models\StaffProfile::whereHas('user', function(\$q) {
    \$q->where('name', 'like', '%joseph%');
})->with('user')->first();
echo json_encode(\$staff->toArray(), JSON_PRETTY_PRINT);
"
```

## Troubleshooting

### Issue: Cannot access staff profiles page
**Solution**: Check permissions
```bash
php artisan tinker --execute="
\$user = App\Models\User::where('email', 'your@email.com')->first();
echo 'Has view staff: ' . (\$user->hasPermissionTo('view staff') ? 'Yes' : 'No') . PHP_EOL;
echo 'Has manage staff: ' . (\$user->hasPermissionTo('manage staff') ? 'Yes' : 'No') . PHP_EOL;
"
```

### Issue: Staff cannot login
**Solution**: Verify credentials
```bash
php artisan tinker --execute="
\$user = App\Models\User::where('name', 'username.here')->first();
if(\$user) {
    echo 'User found: ' . \$user->name . PHP_EOL;
    echo 'Email: ' . \$user->email . PHP_EOL;
    echo 'Password check (use mobile in 07 format): ' . Hash::check('07XXXXXXXX', \$user->password) ? 'Correct' : 'Wrong') . PHP_EOL;
} else {
    echo 'User not found' . PHP_EOL;
}
"
```

### Issue: Duplicate usernames
**Solution**: System automatically handles duplicates by checking existing users before creation. If duplicate exists and user already has a staff profile, new username is not created.

## Password Reset

Staff members should change their password after first login for security. Currently using mobile number as default password for easy initial access.

To manually reset a password:
```bash
php artisan tinker --execute="
\$user = App\Models\User::where('name', 'username.here')->first();
\$user->password = Hash::make('new_password_here');
\$user->save();
echo 'Password reset successful';
"
```

## Next Steps

1. Staff can log in and change their password
2. Admin can manage staff profiles
3. Payroll can be generated for active staff
4. Staff attendance tracking can be implemented
5. Performance reviews can be added

## Support

For issues or questions:
1. Check logs: `storage/logs/laravel.log`
2. Check browser console for frontend errors
3. Verify database migrations are up to date: `php artisan migrate:status`
4. Re-seed if needed: `php artisan db:seed --class=StaffSeeder`
