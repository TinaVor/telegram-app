const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-here';
const fullToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2MDMwNTIyOSwiZXhwIjoxNzYwMzkxNjI5fQ.yLrd0spFcM2h7pXJZyXzAlH2TNt8BLqiCXjm-wrhlJw';

try {
  const decoded = jwt.verify(fullToken, JWT_SECRET);
  console.log('Token decoded successfully:', decoded);
  console.log('User ID from token:', decoded.userId);

  // Проверим структуру токена
  const decodedPart = jwt.decode(fullToken, { complete: true });
  console.log('Token structure:', decodedPart);

} catch (error) {
  console.error('Token verification failed:', error.message);
}
