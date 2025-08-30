export const PUBLIC_ENV = {
    PUBLIC_GUEST_DAILY_LIMIT: parseInt(import.meta.env.PUBLIC_GUEST_DAILY_LIMIT || '1'),
    PUBLIC_SIGNED_USER_DAILY_LIMIT: parseInt(import.meta.env.PUBLIC_SIGNED_USER_DAILY_LIMIT || '2')
}