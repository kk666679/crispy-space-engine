export const formatDate = (date, locale = 'en-US', options = {}) => {
    if (!date) return 'Invalid Date';

    try {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) throw new Error('Invalid Date Format');

        return parsedDate.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options,
        });
    } catch (err) {
        console.error('Date Formatting Error:', err.message);
        return 'Invalid Date';
    }
};
