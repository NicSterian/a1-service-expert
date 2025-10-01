const fs = require('fs');
const path = require('path');
const file = path.join('apps/booking-web/src/pages/HomePage.tsx');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  'style={{ transform: perspective(1200px) rotateX(deg) rotateY(deg) }}',
  'style={{ transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}'
);
text = text.replace(/to=\{\/services#\}/g, 'to={`/services#${service.id}` }');
fs.writeFileSync(file, text);
