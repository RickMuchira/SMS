<?php

namespace Database\Seeders;

use App\Models\StaffDepartment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $staffRole = Role::where('name', 'staff')->first();

        $departments = [
            'Manager' => StaffDepartment::where('code', 'ADMIN')->first()?->id,
            'Secretary' => StaffDepartment::where('code', 'ADMIN')->first()?->id,
            'Driver' => StaffDepartment::where('code', 'TRANS')->first()?->id,
            'Chef' => StaffDepartment::where('code', 'SUPP')->first()?->id,
            'Cleaner / Custodian' => StaffDepartment::where('code', 'SUPP')->first()?->id,
            'Teacher' => StaffDepartment::where('code', 'TEACH')->first()?->id,
        ];

        $staffData = [
            [
                'full_name' => 'Mwangi Joseph Kariuki',
                'gender' => 'Male',
                'designation' => 'Manager',
                'id_number' => '21728462',
                'tsc_number' => null,
                'kra_pin' => 'A007339713U',
                'nssf_number' => '2045930574',
                'sha_number' => 'CR8594323096211-4',
                'equity_account' => null,
                'mobile_no' => '+254 704 239 729',
                'next_of_kin_name' => 'Esther Wanjiru',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 7908 971 871',
            ],
            [
                'full_name' => 'Arvidiza Christine',
                'gender' => 'Female',
                'designation' => 'Secretary',
                'id_number' => '29706455',
                'tsc_number' => null,
                'kra_pin' => 'A012519313Z',
                'nssf_number' => null,
                'sha_number' => null,
                'equity_account' => null,
                'mobile_no' => '+254 795 086 819',
                'next_of_kin_name' => null,
                'next_of_kin_relationship' => null,
                'next_of_kin_phone' => null,
            ],
            [
                'full_name' => 'Michael Ngugi Wairimu',
                'gender' => 'Male',
                'designation' => 'Driver',
                'id_number' => '32293397',
                'tsc_number' => null,
                'kra_pin' => 'A011928895W',
                'nssf_number' => '2015826332',
                'sha_number' => 'CR0709363994188-2',
                'equity_account' => null,
                'mobile_no' => '+254 769 748 494',
                'next_of_kin_name' => 'Peter Mburu',
                'next_of_kin_relationship' => 'Brother',
                'next_of_kin_phone' => '+254 745 205 395',
            ],
            [
                'full_name' => 'Dennis Thiga Mwaniki',
                'gender' => 'Male',
                'designation' => 'Driver',
                'id_number' => '26533524',
                'tsc_number' => null,
                'kra_pin' => 'A007417882J',
                'nssf_number' => '612033821',
                'sha_number' => 'CR5492387270639-8',
                'equity_account' => '0340192946836',
                'mobile_no' => '+254 716 890 860',
                'next_of_kin_name' => 'Magreate Wambui',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 728 223 799',
            ],
            [
                'full_name' => 'Felix Kabui Kamau',
                'gender' => 'Male',
                'designation' => 'Driver',
                'id_number' => '26505486',
                'tsc_number' => null,
                'kra_pin' => 'A005442349Q',
                'nssf_number' => '838036910',
                'sha_number' => 'CR9732812179314-9',
                'equity_account' => '0340178877342',
                'mobile_no' => '+254 726 954 089',
                'next_of_kin_name' => 'Purity',
                'next_of_kin_relationship' => 'Mother',
                'next_of_kin_phone' => '+254 720 137 684',
            ],
            [
                'full_name' => 'Marha Wambui Ngugi',
                'gender' => 'Female',
                'designation' => 'Chef',
                'id_number' => '22763971',
                'tsc_number' => null,
                'kra_pin' => 'A015306714J',
                'nssf_number' => '2060890624',
                'sha_number' => 'CR6671293358833-3',
                'equity_account' => '0260169417313',
                'mobile_no' => '+254 724 136 378',
                'next_of_kin_name' => 'Shadrack Muia',
                'next_of_kin_relationship' => 'Son',
                'next_of_kin_phone' => '+254 718 960 576',
            ],
            [
                'full_name' => 'Tom Omueri Nyakundi',
                'gender' => 'Male',
                'designation' => 'Chef',
                'id_number' => '36418416',
                'tsc_number' => null,
                'kra_pin' => 'A014031468G',
                'nssf_number' => '00268895',
                'sha_number' => null,
                'equity_account' => '1710186756528',
                'mobile_no' => '+254 725 669 361',
                'next_of_kin_name' => 'Zedekiah Koch',
                'next_of_kin_relationship' => 'Relative',
                'next_of_kin_phone' => '+254 791 230 188',
            ],
            [
                'full_name' => 'Elizabeth Wairimu Kiarie',
                'gender' => 'Female',
                'designation' => 'Cleaner / Custodian',
                'id_number' => '27078877',
                'tsc_number' => null,
                'kra_pin' => 'A009400155K',
                'nssf_number' => '2035608582',
                'sha_number' => 'CR2088570826478-8',
                'equity_account' => '0890171589774',
                'mobile_no' => '+254 707 784 482',
                'next_of_kin_name' => 'Marion Wanjiru Kiarie',
                'next_of_kin_relationship' => 'Sister',
                'next_of_kin_phone' => '+254 708 668 963',
            ],
            [
                'full_name' => 'Simon Waweru Kamau',
                'gender' => 'Male',
                'designation' => 'Cleaner / Custodian',
                'id_number' => '39303248',
                'tsc_number' => null,
                'kra_pin' => 'A021159970D',
                'nssf_number' => '2049591404',
                'sha_number' => 'CR6840414810690-9',
                'equity_account' => '0340185540161',
                'mobile_no' => '+254 115 408 756',
                'next_of_kin_name' => 'Mary Nyambura',
                'next_of_kin_relationship' => 'Mother',
                'next_of_kin_phone' => '+254 792 058 718',
            ],
            [
                'full_name' => 'Jane Wanjiru Muthinga',
                'gender' => 'Female',
                'designation' => 'Cleaner / Custodian',
                'id_number' => '22784827',
                'tsc_number' => null,
                'kra_pin' => 'A008512606M',
                'nssf_number' => '2007007301',
                'sha_number' => 'CR3495819871419-2',
                'equity_account' => '0090163959612',
                'mobile_no' => '+254 727 085 201',
                'next_of_kin_name' => 'Ann Muthinga',
                'next_of_kin_relationship' => 'Sister',
                'next_of_kin_phone' => '+254 791 717 105',
            ],
            [
                'full_name' => 'Felister Munywa Kyania',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '26965256',
                'tsc_number' => '1133515',
                'kra_pin' => 'A0085713597',
                'nssf_number' => '2006925117',
                'sha_number' => null,
                'equity_account' => '1710184023360',
                'mobile_no' => '+254 722 350 510',
                'next_of_kin_name' => 'Augustine Kilonzi',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 115 298 473',
            ],
            [
                'full_name' => 'Niva Nabifwo Watitwa',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '35582302',
                'tsc_number' => '1002753',
                'kra_pin' => 'A018399193P',
                'nssf_number' => '2059321402',
                'sha_number' => 'CR3866483153434-6',
                'equity_account' => '1710186458555',
                'mobile_no' => '+254 757 535 936',
                'next_of_kin_name' => 'Griffin Kibaba',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 748 457 849',
            ],
            [
                'full_name' => 'Jean Paul Fabrice Ubunyanja',
                'gender' => 'Male',
                'designation' => 'Teacher',
                'id_number' => null,
                'tsc_number' => null,
                'kra_pin' => null,
                'nssf_number' => null,
                'sha_number' => null,
                'equity_account' => null,
                'mobile_no' => '+254 116 353 999',
                'next_of_kin_name' => 'Josiane Nimbona',
                'next_of_kin_relationship' => 'Friend',
                'next_of_kin_phone' => '+254 074 680 893',
            ],
            [
                'full_name' => 'Mary Wanjiru Migwi',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '32653368',
                'tsc_number' => null,
                'kra_pin' => 'A012526641T',
                'nssf_number' => '2045150564',
                'sha_number' => 'CR4706103038924-3',
                'equity_account' => '0870182611530',
                'mobile_no' => '+254 796 541 809',
                'next_of_kin_name' => 'Bernard Kamau',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 727 682 869',
            ],
            [
                'full_name' => 'Catherine Wairimu Kamotho',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '34987921',
                'tsc_number' => '854981',
                'kra_pin' => 'A013957710Y',
                'nssf_number' => '20525423377',
                'sha_number' => 'CR1755477546241-1',
                'equity_account' => '0890180628394',
                'mobile_no' => '+254 719 794 382',
                'next_of_kin_name' => 'Francis Kamotho',
                'next_of_kin_relationship' => 'Father',
                'next_of_kin_phone' => '+254 722 152 540',
            ],
            [
                'full_name' => 'Lydiah Wanjiru Munene',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '25112340',
                'tsc_number' => null,
                'kra_pin' => 'A007930127R',
                'nssf_number' => null,
                'sha_number' => 'CR6136319400176-7',
                'equity_account' => '0110190731416',
                'mobile_no' => '+254 724 761 819',
                'next_of_kin_name' => 'Mary Njambi Njaria',
                'next_of_kin_relationship' => 'Mother',
                'next_of_kin_phone' => '+254 721 756 148',
            ],
            [
                'full_name' => 'Jane Nyambura Kiarie',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '8633950',
                'tsc_number' => null,
                'kra_pin' => 'A004024264J',
                'nssf_number' => '721766811',
                'sha_number' => null,
                'equity_account' => '0090100131937',
                'mobile_no' => '+254 720 866 049',
                'next_of_kin_name' => 'Francis Kiarie',
                'next_of_kin_relationship' => 'Son',
                'next_of_kin_phone' => null,
            ],
            [
                'full_name' => 'Mwangi Jackson Ndirangu',
                'gender' => 'Male',
                'designation' => 'Teacher',
                'id_number' => '25948694',
                'tsc_number' => null,
                'kra_pin' => 'A00546652D',
                'nssf_number' => '2004080952',
                'sha_number' => 'CR4937847630777-0',
                'equity_account' => '0640193810870',
                'mobile_no' => '+254 711 406 541',
                'next_of_kin_name' => 'Virginiah Wanjiku',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 793 711 741',
            ],
            [
                'full_name' => 'Tabitha Wangui Maina',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '39193940',
                'tsc_number' => null,
                'kra_pin' => 'A015281175M',
                'nssf_number' => null,
                'sha_number' => null,
                'equity_account' => '0090179948456',
                'mobile_no' => '+254 102 937 190',
                'next_of_kin_name' => 'Hannah Kamau',
                'next_of_kin_relationship' => 'Mother',
                'next_of_kin_phone' => '+254 703 796 854',
            ],
            [
                'full_name' => 'Janepher Nanyama Wamalwa',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '34590511',
                'tsc_number' => null,
                'kra_pin' => 'A018803620Q',
                'nssf_number' => null,
                'sha_number' => null,
                'equity_account' => null,
                'mobile_no' => '+254 113 001 506',
                'next_of_kin_name' => 'Cecily Cichira',
                'next_of_kin_relationship' => null,
                'next_of_kin_phone' => '+254 723 051 063',
            ],
            [
                'full_name' => 'Wiliam Mutua Benard',
                'gender' => 'Male',
                'designation' => 'Teacher',
                'id_number' => '40288549',
                'tsc_number' => null,
                'kra_pin' => 'A017449209Y',
                'nssf_number' => '2059730931',
                'sha_number' => 'CR1794574197022-4',
                'equity_account' => '0600182122644',
                'mobile_no' => '+254 111 775 463',
                'next_of_kin_name' => 'Ruth Benard',
                'next_of_kin_relationship' => 'Mother',
                'next_of_kin_phone' => '+254 710 703 752',
            ],
            [
                'full_name' => 'Alice Wanjiru Kimani',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '26668745',
                'tsc_number' => '1027574',
                'kra_pin' => 'A009785730H',
                'nssf_number' => '2030433536',
                'sha_number' => 'CR2828620229067-0',
                'equity_account' => '0880162398919',
                'mobile_no' => '+254 710 189 867',
                'next_of_kin_name' => 'Elvin Kimani',
                'next_of_kin_relationship' => 'Father',
                'next_of_kin_phone' => '+254 720 144 826',
            ],
            [
                'full_name' => 'Willy Mwangi Kimani',
                'gender' => 'Male',
                'designation' => 'Teacher',
                'id_number' => '25341906',
                'tsc_number' => null,
                'kra_pin' => 'A0121027841',
                'nssf_number' => '8677479',
                'sha_number' => 'CR8882680774594-6',
                'equity_account' => '0340192673289',
                'mobile_no' => '+254 726 114 863',
                'next_of_kin_name' => 'Grace Njeri',
                'next_of_kin_relationship' => 'Spouse',
                'next_of_kin_phone' => '+254 712 529 769',
            ],
            [
                'full_name' => 'Immaculate Ikedi',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => null,
                'tsc_number' => null,
                'kra_pin' => 'A00701084',
                'nssf_number' => '0748471599',
                'sha_number' => null,
                'equity_account' => null,
                'mobile_no' => '+254 748 471 599',
                'next_of_kin_name' => null,
                'next_of_kin_relationship' => null,
                'next_of_kin_phone' => null,
            ],
            [
                'full_name' => 'Marha Wairimu Njoroge',
                'gender' => 'Female',
                'designation' => 'Teacher',
                'id_number' => '22451822',
                'tsc_number' => '630169/Y',
                'kra_pin' => 'A006356919X',
                'nssf_number' => '315051825',
                'sha_number' => 'CR0805240805689-1',
                'equity_account' => '0130100219816',
                'mobile_no' => '+254 796 472 814',
                'next_of_kin_name' => 'David Newton Nkoroge',
                'next_of_kin_relationship' => 'Son',
                'next_of_kin_phone' => '+254 112 509 920',
            ],
        ];

        DB::beginTransaction();

        try {
            foreach ($staffData as $index => $data) {
                $username = $this->generateUsername($data['full_name']);
                $password = $this->convertMobileTo07Format($data['mobile_no']);

                $existingUser = User::where('name', $username)->first();

                if ($existingUser && ! $existingUser->staffProfile) {
                    $user = $existingUser;
                } else {
                    $user = User::create([
                        'name' => $username,
                        'email' => $username.'@staff.local',
                        'password' => Hash::make($password),
                    ]);
                }

                if ($staffRole && ! $user->hasRole('staff')) {
                    $user->assignRole($staffRole);
                }

                $employeeId = 'EMP'.str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT);

                $departmentId = $departments[$data['designation']] ?? null;

                StaffProfile::create([
                    'user_id' => $user->id,
                    'employee_id' => $employeeId,
                    'national_id_number' => $data['id_number'],
                    'gender' => strtolower($data['gender'] ?? 'other'),
                    'phone_number' => $data['mobile_no'],
                    'next_of_kin_name' => $data['next_of_kin_name'],
                    'next_of_kin_relationship' => $data['next_of_kin_relationship'],
                    'next_of_kin_phone' => $data['next_of_kin_phone'],
                    'job_title' => $data['designation'],
                    'department_id' => $departmentId,
                    'employment_type' => 'full-time',
                    'employment_status' => 'active',
                    'tsc_number' => $data['tsc_number'],
                    'kra_pin' => $data['kra_pin'],
                    'nssf_number' => $data['nssf_number'],
                    'sha_shif_number' => $data['sha_number'],
                    'bank_name' => $data['equity_account'] ? 'Equity Bank' : null,
                    'bank_account_number' => $data['equity_account'],
                    'gross_monthly_salary' => 50000.00,
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function generateUsername(string $fullName): string
    {
        $names = preg_split('/\s+/', trim($fullName));
        $firstTwo = array_slice($names, 0, 2);
        $username = implode('.', array_map('strtolower', $firstTwo));

        return $username;
    }

    private function convertMobileTo07Format(string $mobile): string
    {
        $cleaned = preg_replace('/[^\d]/', '', $mobile);

        if (str_starts_with($cleaned, '254')) {
            $cleaned = '0'.substr($cleaned, 3);
        }

        return $cleaned;
    }
}
