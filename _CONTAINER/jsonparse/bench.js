import { JSONParser as Parser } from './jsonparse.js'

(async () => {

const FILE = './samplejson/basic.json';

const json = await (typeof Deno !== 'undefined' 
  ? Deno.readTextFile(FILE)
  : fetch(FILE).then(x => x.text()));

while (true) {
  var start = Date.now();
  for (var i = 0; i < 1000; i++) {
    JSON.parse(json);
  }
  var first = Date.now() - start;

  start = Date.now();
  var p = new Parser();
  for (var i = 0; i < 1000; i++) {
    p.write(json);
  }
  var second = Date.now() - start;


  console.log("JSON.parse took %s", first);
  console.log("streaming parser took %s", second);
  console.log("streaming is %s times slower", second / first);
}

})();