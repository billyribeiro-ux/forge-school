import { fail, type Actions } from '@sveltejs/kit';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

const MAX_MESSAGE_LENGTH = 5000;

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = (form.get('name') ?? '').toString().trim();
		const email = (form.get('email') ?? '').toString().trim();
		const message = (form.get('message') ?? '').toString().trim();

		if (name === '' || email === '' || message === '') {
			return fail(400, {
				error: 'All fields are required.',
				values: { name, email, message }
			});
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, {
				error: 'Enter a valid email address.',
				values: { name, email, message }
			});
		}
		if (message.length > MAX_MESSAGE_LENGTH) {
			return fail(400, {
				error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
				values: { name, email, message }
			});
		}

		if (RESEND_API_KEY === '' || RESEND_FROM_EMAIL === '') {
			// Dev path — no Resend key yet. Accept the message, log it,
			// and surface success so the UI flow is testable.
			console.info('[contact] no RESEND key; skipping send', { name, email });
			return { sent: true };
		}

		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: RESEND_FROM_EMAIL,
				to: [RESEND_FROM_EMAIL],
				subject: `ForgeSchool contact from ${name}`,
				reply_to: email,
				text: `Name: ${name}\nEmail: ${email}\n\n${message}`
			})
		});

		if (!res.ok) {
			return fail(502, {
				error: 'Send failed; please email us directly at support@forgeschool.dev.',
				values: { name, email, message }
			});
		}

		return { sent: true };
	}
};
