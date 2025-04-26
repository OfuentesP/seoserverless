export async function runWebPageTest(url) {
  const res = await fetch('/api/run-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error backend: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return await res.json();
}

export async function getLighthouseResults(testId) {
  const res = await fetch(`/api/lighthouse/${testId}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error backend: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return await res.json();
} 