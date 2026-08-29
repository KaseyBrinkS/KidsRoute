export async function sendReportEmailAlert(payload) {
  const response = await fetch('/api/send-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: payload.reporterName,
      reportedUserName: payload.reportedUserName,
      groupName: payload.groupName,
      reason: payload.reason,
      details: payload.details,
      timestamp: payload.timestamp,
    }),
  })

  if (!response.ok) {
    throw new Error('Could not send report email.')
  }
}
