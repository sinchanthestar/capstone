

async function testApi() {
    try {
        console.log('Testing POST /api/leave-requests...');
        const response = await fetch('http://localhost:3000/api/leave-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assignmentId: 'test-id',
                reason: 'test reason'
            })
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        const text = await response.text();
        console.log('Raw body:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.log('Body is not JSON');
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testApi();
