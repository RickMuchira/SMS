<?php

return [
    /*
    |--------------------------------------------------------------------------
    | School Email Domain
    |--------------------------------------------------------------------------
    |
    | This domain is used to auto-generate emails for students, teachers,
    | drivers, and module admins when no email is provided. Set this to
    | your school's domain (e.g., myschool.com).
    |
    */

    'email_domain' => env('SCHOOL_EMAIL_DOMAIN', 'myschool.com'),

    /*
    |--------------------------------------------------------------------------
    | School Name
    |--------------------------------------------------------------------------
    |
    | The official name of your school, used in various parts of the system.
    |
    */

    'name' => env('SCHOOL_NAME', 'My School'),
];
