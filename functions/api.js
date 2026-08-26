export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    if(request.method === "OPTIONS") return new Response(null,{headers:cors});

    // 上传接口：存入数据库
    if(path === "/api/upload" && request.method === "POST"){
        const { title, desc, download_url } = await request.json();
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO files(id,title,desc,download_url) VALUES(?,?,?,?)`)
            .bind(id, title, desc, download_url).run();
        return new Response(JSON.stringify({ok:true}),{headers:cors});
    }

    // 列表查询接口
    if(path === "/api/list"){
        const keyword = url.searchParams.get("keyword") || "";
        const { results } = await env.DB.prepare(`SELECT * FROM files WHERE title LIKE ?`)
            .bind(`%${keyword}%`).all();
        return new Response(JSON.stringify(results),{headers:cors});
    }

    return new Response("404 Not Found",{status:404,headers:cors});
}
