(async () => {
  const base = 'http://localhost:5000';
  // login
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'reqtester3@example.com', password: 'pass1234' })
  });
  const loginBody = await loginRes.json();
  console.log('login status', loginRes.status, loginBody);
  const token = loginBody.token;
  // create activity (invalid competency ids will produce error, but attempt to reach endpoint)
  const createRes = await fetch(`${base}/api/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: 'Test Activity Y', competencyId: 'fake', activityTypeId: 'fake', documentUrl: 'http://example.com/doc.pdf' })
  });
  const createBody = await createRes.json().catch(() => ({}));
  console.log('create status', createRes.status, createBody);
})();
