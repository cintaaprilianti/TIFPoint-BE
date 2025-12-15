(async () => {
  try {
    const res = await fetch('http://localhost:5000/__test-log');
    console.log('test-log status', res.status);
    console.log('body', await res.json().catch(() => null));
  } catch (e) {
    console.error('callTestLog error', e);
    process.exit(1);
  }
})();
