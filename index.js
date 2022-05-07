const Koa = require("koa");
const app = new Koa();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const mimes = {
	css: "text/css",
	less: "text/css",
	gif: "image/gif",
	html: "text/html",
	ico: "image/x-icon",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	js: "text/javascript",
	json: "application/json",
	pdf: "application/pdf",
	png: "image/png",
	svg: "image/svg+xml",
	swf: "application/x-shockwave-flash",
	tiff: "image/tiff",
	txt: "text/plain",
	wav: "audio/x-wav",
	wma: "audio/x-ms-wma",
	wmv: "video/x-ms-wmv",
	xml: "text/xml"
};

function parseMime(url) {
	// path.extname获取路径中文件的后缀名
	let extName = path.extname(url);
	extName = extName ? extName.slice(1) : "unknown";
	return mimes[extName];
}

const parseStatic = dir => {
	return new Promise(resolve => {
		resolve(fs.readFileSync(dir), "binary");
	});
};

const getFileStat = dir => {
	return new Promise(resolve => {
		resolve(fs.statSync(dir));
	});
};

app.use(async ctx => {
	const url = ctx.request.url;
	ctx.set("Content-Type", parseMime(url));
	if (url === "/") {
		// 访问根路径返回index.html
		ctx.body = await parseStatic("index.html");
	} else {
		/********************************************************
		 * 强缓存
		 *******************************************************/

		/** 设置过期时间在30000毫秒，也就是30秒后 */
		// ctx.set("Expires", new Date(Date.now() + 30000));
		/** cache-control优先级大于expires */
		// ctx.set("cache-control", `max-age=${new Date(Date.now() + 40000)}`);

		/********************************************************
		 * 对比缓存
		 ********************************************************/

		ctx.set("cache-control", `no-cache`);
		/**	Etag 为文件生成的hash值 */
		const fileBuffer = await parseStatic("./" + url);
		const ifNoneMatch = ctx.request.headers["if-none-match"];
		const hash = crypto.createHash("md5");
		hash.update(fileBuffer);
		const etag = `"${hash.digest("hex")}"`;
		if (ifNoneMatch === etag) {
			console.log("ifNoneMatch === etag: ", ifNoneMatch === etag);
			ctx.status = 304;
		} else {
			ctx.set("etag", etag);
			ctx.body = fileBuffer;
		}

		/** last-modified: 文件上次修改时间，优先级小于Etag */
		const ifModifiedSince = ctx.request.header["if-modified-since"];
		const fileStat = await getFileStat("./" + url);
		if (ifModifiedSince === fileStat.mtime.toGMTString()) {
			ctx.status = 304;
		} else {
			ctx.set("Last-Modified", fileStat.mtime.toGMTString());
			ctx.body = await parseStatic("./" + url);
		}
	}
});

app.listen(3000, () => {
	console.log("starting at port 3000");
});
