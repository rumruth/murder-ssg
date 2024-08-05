const fs = require('fs-extra');
const path = require('path');
const showdown = require('showdown');
const ejs = require('ejs');

require('dotenv').config();

const buildDir = path.join(__dirname, 'build');
const sourceDir = path.join(__dirname, 'src');
const templateDir = path.join(__dirname, 'templates');

const converter = new showdown.Converter({ metadata: true });

const walk = async (dir, test) => {
	return new Promise((resolve, reject) => {
		fs.readdir(dir, async function(err, list) {
		    if (err) reject(err);

		    let pending = list.length;

		    if (!pending) return reject(err);

		    for (const file of list) {
	      		filePath = path.resolve(dir, file);

				const stat = await fs.stat(filePath);

				if (stat && stat.isDirectory()) {
					//Its a directory
					console.log("Directory:", filePath);

					//Ensure directory
					await fs.ensureDir(path.resolve(buildDir, file));

					//Walk subdirectory
					await walk(filePath);
				}
				else {
					//Its a file
					console.log("File:", filePath);

					let fileData = path.parse(filePath);

					//Only parse markdown files
					if (fileData.ext === ".md") {
						let fileContents = await fs.readFile(filePath, 'utf-8');
						let fileHTML = converter.makeHtml(fileContents);
						let fileMetadata = converter.getMetadata();

						//Get parent directory
						let relative = path.relative(sourceDir, fileData.dir);
						let joined = path.join(buildDir, relative);

						//Render file

						//Get a specific template, or render with a default
						let fileTemplate = fileData.template || "base";
						let fileTemplatePath = path.join(templateDir, fileTemplate + ".ejs");

						//Get template code
						let template = await fs.readFile(fileTemplatePath, 'utf-8');

						let renderedFile = ejs.render(template, {
							content: fileHTML,
							...fileMetadata
						});

						//Place in new directory
						let fileOutput = path.resolve(joined, fileData.name + ".html");

						await fs.outputFile(fileOutput, renderedFile);
					}
				}
		    }

			resolve();
		});
	});
}

async function main (directory) {
  try {
  	console.time('Execution time');
  	//Ensure /build directory exists
    await fs.ensureDir(buildDir);

    if (!process.env.ERASE_BUILD !=== "false") await fs.emptyDir(buildDir);

    console.log("Building...");
    await walk(sourceDir);
    console.log("Built.");

	console.timeEnd('Execution time');
  }
  catch (err) {
    console.error(err);
  }
}

main();