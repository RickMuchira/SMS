<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configureRedirects();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);

        // Custom authentication to distinguish admin login from normal login.
        Fortify::authenticateUsing(function (Request $request): ?User {
            /** @var \App\Models\User|null $user */
            $user = User::where('email', $request->string('email'))->first();

            if (! $user || ! Hash::check($request->string('password'), $user->password)) {
                return null;
            }

            // When logging in via /admin/login, only allow users with admin roles.
            if ($request->boolean('admin_mode')) {
                // Allow super-admin, student-admin, driver-admin, etc.
                $allowedRoles = ['super-admin', 'student-admin', 'driver-admin'];
                
                if (! $user->hasAnyRole($allowedRoles)) {
                    return null;
                }

                // Remember that this login came from the admin login page.
                $request->session()->put('login_via_admin', true);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register'));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }

    /**
     * Configure post-login redirects.
     */
    private function configureRedirects(): void
    {
        Fortify::redirects('login', function () {
            $user = auth()->user();
            $request = request();

            // If the user logged in via /admin/login, always send them to the admin dashboard.
            if ($request->session()->pull('login_via_admin', false)) {
                return route('admin.dashboard');
            }

            // Redirect superadmins to user management; others to admin dashboard.
            if ($user && $user->can('manage roles')) {
                return route('admin.users.index');
            }

            return route('admin.dashboard');
        });
    }
}
