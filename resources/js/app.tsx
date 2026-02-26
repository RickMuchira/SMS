import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';
import { AuthProvider } from './context/auth-context';
import type { AuthUserWithRbacPageProps } from '@/types/auth';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        const pageProps = props.initialPage.props as AuthUserWithRbacPageProps;

        root.render(
            <StrictMode>
                <AuthProvider
                    initialUser={pageProps.auth?.user ?? null}
                    initialRoles={pageProps.auth?.roles ?? []}
                    initialPermissions={pageProps.auth?.permissions ?? []}
                >
                    <App {...props} />
                </AuthProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
