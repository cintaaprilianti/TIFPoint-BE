import fetch from 'node-fetch';

const base = 'http://localhost:5000';

async function main() {
  // Register
  const reg = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'reqtester', email: 'reqtester@example.com', password: 'pass1234', name: 'Req Tester' })
  });
  console.log('Register status:', reg.status);
  const regBody = await reg.json().catch(() => ({}));
  console.log('Register body:', regBody);

  // Login
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reqtester@example.com', password: 'pass1234' })
  });
  console.log('Login status:', login.status);
  const loginBody = await login.json();
  console.log('Login body:', loginBody);
  const token = loginBody.token;

  // Create activity
  const create = await fetch(`${base}/api/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title: 'Test Activity', competencyId: 'nonexistent', activityTypeId: 'nonexistent', documentUrl: 'http://example.com/doc.pdf' })
  });
  console.log('Create activity status:', create.status);
  const createBody = await create.json().catch(() => ({}));
  console.log('Create activity body:', createBody);
}

main().catch(console.error);
