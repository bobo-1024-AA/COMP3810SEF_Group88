// Text-only messages for registration status updates.
function registrationEmail(status, student, event) {
  const greeting = `Dear ${student.name},`;
  const closing = '\n\nThank you,\nMetro FAITH Team';
  const details = `Activity: ${event.name}\nDate and time: ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(event.date))} (Hong Kong time)\nLocation: ${event.location}`;
  if (status === 'pending')
    return {
      subject: `Application received: ${event.name}`,
      text: `${greeting}\n\nWe have received your application for the following activity. Your application is being processed and we will notify you when its status changes.\n\n${details}${closing}`,
    };
  if (status === 'waitlisted')
    return {
      subject: `Waiting list: ${event.name}`,
      text: `${greeting}\n\nWe have received your application for the following activity. The activity is full, so you have been placed on the waiting list. Your place is not yet confirmed. We will notify you if your status changes.\n\n${details}${closing}`,
    };
  if (status === 'confirmed')
    return {
      subject: `Registration confirmed: ${event.name}`,
      text: `${greeting}\n\nYour registration for the following activity has been confirmed. Please attend on time. If you can no longer attend, please cancel your registration in the system as soon as possible.\n\n${details}${closing}`,
    };
  return null;
}

module.exports = { registrationEmail };
