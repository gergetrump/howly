// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '@/services/authService';

export function RegisterPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const data = await registerUser(formData);

            localStorage.setItem('howly_token', data.token);

            navigate('/dashboard');
        } catch (error) {
            setError(error.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-lg">
                <h1 className="mb-6 text-center text-3xl font-bold text-white">
                    Create your account
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            Username
                        </label>
                        <input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            First name
                        </label>
                        <input
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            Last name
                        </label>
                        <input
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Creating account...' : 'Register'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-slate-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-400 hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}