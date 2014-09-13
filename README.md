# file-index

Quickly create an in memory index of files and their content

### simple
```
var FileIndex = require('file-index')

FileIndex.load(['/some/path'], function (err, results) {
	// loads and parses json files
	// loads all the rest of the files as buffers
	// results: { '/some/path/1.json': { a: 1}, '/some/path/2.txt': buffer }
})
```

### customize
```
function myCustomHandler(fullPathFilename, callback) {
	fs.readFile(fullPathFilename, function (err, content) {
		if (err) return callback(err)

		callback(null, customParse(content))
	})	
}

var handlers = FileIndex	
	.handle('*.json', FileIndex.loadJsonFile) // load and parse .json files	
	.handle('*.foo', FileIndex.loadRawFile)	// .foo as buffers
	.handle('*.bar', FileIndex.loadRawUtf8File) // .bar as text
	.handle('*', myCustomHandler) // a non mandatory fallthrough custom handler
	.create()

// mix directories and files
FileIndex.load(['/some/path/', '/some/file.bar', '/yet/another/path'], handlers, function(err, results) {
	console.log(err, results)

	/* 
		results:
		
		{
			'/some/path/1.json': { blabla: 1 },
			'/some/path/2.json': { blabla: 2},
			'/some/file.bar': 'foorbar',
			'/yet/another/path/x.log': 'a b c'
		}
	*/
})
```

// TODO: improve test coverage