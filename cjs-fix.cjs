require('fs').readdirSync('./dist').forEach(file => {
  if (file.endsWith('.js')) {
    let content = require('fs').readFileSync(`./dist/${file}`, 'utf8');
    content = content.replace(/from \['(\.\/.*\.js)'\]/g, "from './$1'");
    require('fs').writeFileSync(`./dist/${file}`, content);
  }
});
