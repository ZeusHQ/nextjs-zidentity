import React from 'react';
// import { useUser } from '@zeushq/nextjs-zidentity';

import Layout from '../components/Layout';

export default function Home() {
    // const { user, error, isLoading } = useUser();
    const user = null;
    const error = null;
    const isLoading = false;

    return (
        <Layout>
            <h1>Next.js and Zeus Identity Example</h1>

            {isLoading && <p>Loading login info...</p>}

            {error && (
                <>
                    <h4>Error</h4>
                    <pre>{error.message}</pre>
                </>
            )}

            {user && (
                <>
                    <h4>Rendered user info on the client</h4>
                    <pre data-testid="profile">{JSON.stringify(user, null, 2)}</pre>
                </>
            )}

            {!isLoading && !error && !user && (
                <>
                    <p>
                        To test the login click in <i>Login</i>
                    </p>
                    <p>
                        Once you have logged in you should be able to click in <i>Protected Page</i> and <i>Logout</i>
                    </p>
                </>
            )}
        </Layout>
    );
}