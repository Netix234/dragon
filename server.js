const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config?.();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "public", "uploads");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(DATA, "dragoncore.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
 price REAL NOT NULL DEFAULT 0, compare_price REAL DEFAULT 0, stock INTEGER DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'in_stock', image TEXT DEFAULT '', gallery TEXT DEFAULT '[]',
 short_description TEXT DEFAULT '', description TEXT DEFAULT '', specs TEXT DEFAULT '{}',
 featured INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE, customer_name TEXT, email TEXT,
 phone TEXT, country TEXT, city TEXT, postal_code TEXT, address TEXT, delivery TEXT,
 note TEXT, currency TEXT, total REAL, items TEXT, status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, author TEXT, rating INTEGER,
 text TEXT, visible INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES products(id)
);
`);
const adminEmail = process.env.ADMIN_EMAIL || "admin@dragoncore.local";
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
if (!db.prepare("SELECT id FROM admins WHERE email=?").get(adminEmail)) {
  db.prepare("INSERT INTO admins(email,password_hash) VALUES(?,?)").run(adminEmail, bcrypt.hashSync(adminPassword, 12));
}
const count = db.prepare("SELECT COUNT(*) n FROM products").get().n;
if (!count) {
 const seed = [
  ["DragonCore VORTEX","DragonCore",1899,2199,4,"in_stock","/assets/pc-vortex.svg","Готовый игровой ПК для высокого FPS.","Ryzen 7 • RTX 5070 • 32GB DDR5 • 1TB NVMe",1],
  ["DragonCore TITAN","DragonCore",2699,0,0,"preorder","/assets/pc-titan.svg","Мощная система для игр и творчества.","Ryzen 9 • RTX 5080 • 64GB DDR5 • 2TB NVMe",1],
  ["GeForce RTX 5070 12GB","Components",649,0,7,"in_stock","/assets/gpu.svg","Производительная видеокарта нового поколения.","12GB GDDR7 • PCIe 5.0",1],
  ["AMD Ryzen 7 9800X3D","Components",479,0,5,"in_stock","/assets/cpu.svg","Процессор для топового игрового ПК.","8 ядер • 16 потоков • AM5",1],
  ["Mechanical Keyboard K87","Peripherals",119,0,12,"in_stock","/assets/keyboard.svg","Механическая клавиатура с RGB-подсветкой.","Hot-swap • RGB • USB-C",0],
  ["DragonCore 27 Gaming Monitor","Peripherals",329,0,0,"sold_out","/assets/monitor.svg","Игровой монитор с высокой частотой обновления.","27 inch • 2560×1440 • 180Hz",0]
 ];
 const ins = db.prepare("INSERT INTO products(name,category,price,compare_price,stock,status,image,short_description,description,featured) VALUES(?,?,?,?,?,?,?,?,?,?)");
 for (const p of seed) ins.run(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],p[9]);
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
 secret: process.env.SESSION_SECRET || "dragoncore-development-secret-change-before-deploy",
 resave:false, saveUninitialized:false,
 cookie:{ httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV === "production", maxAge: 8*60*60*1000 }
}));
app.use(express.static(path.join(ROOT,"public")));
const upload = multer({ storage: multer.diskStorage({
 destination: (_req,_file,cb)=>cb(null,UPLOADS),
 filename: (_req,file,cb)=>cb(null,Date.now()+"-"+Math.random().toString(36).slice(2,8)+path.extname(file.originalname).toLowerCase())
}), limits:{fileSize:8*1024*1024}, fileFilter:(_req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });

const adminOnly = (req,res,next)=> req.session.admin ? next() : res.status(401).json({error:"Требуется вход администратора"});
const safeProduct = p => ({...p, gallery:JSON.parse(p.gallery||"[]"), specs:JSON.parse(p.specs||"{}")});
app.get("/api/products",(req,res)=>{
 const {category, search, featured} = req.query;
 let sql="SELECT * FROM products WHERE 1=1", args=[];
 if(category && category!=="All"){sql+=" AND category=?";args.push(category);}
 if(search){sql+=" AND (name LIKE ? OR short_description LIKE ?)";args.push("%"+search+"%","%"+search+"%");}
 if(featured==="1") sql+=" AND featured=1";
 sql+=" ORDER BY featured DESC, created_at DESC";
 res.json(db.prepare(sql).all(...args).map(safeProduct));
});
app.get("/api/products/:id",(req,res)=>{
 const p=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
 if(!p)return res.status(404).json({error:"Товар не найден"});
 res.json(safeProduct(p));
});
app.get("/api/products/:id/reviews",(req,res)=>{
 res.json(db.prepare("SELECT id,product_id,author,rating,text,created_at FROM reviews WHERE product_id=? AND visible=1 ORDER BY created_at DESC").all(req.params.id));
});
app.post("/api/products/:id/reviews",(req,res)=>{
 const p=db.prepare("SELECT id FROM products WHERE id=?").get(req.params.id);
 const {author,rating,text}=req.body;
 if(!p)return res.status(404).json({error:"Товар не найден"});
 if(!author?.trim()||!text?.trim()||!Number.isInteger(Number(rating))||rating<1||rating>5)return res.status(400).json({error:"Заполните имя, оценку от 1 до 5 и текст отзыва"});
 const result=db.prepare("INSERT INTO reviews(product_id,author,rating,text) VALUES(?,?,?,?)").run(p.id,author.trim().slice(0,80),Number(rating),text.trim().slice(0,2000));
 res.status(201).json({id:result.lastInsertRowid,ok:true});
});
app.post("/api/orders",(req,res)=>{
 const {customer_name,email,phone,country,city,postal_code,address,delivery,note,currency,items}=req.body;
 if(!customer_name||!email||!phone||!country||!city||!address||!Array.isArray(items)||!items.length)return res.status(400).json({error:"Заполните обязательные поля заказа"});
 let total=0, normalized=[];
 for(const item of items){
  const p=db.prepare("SELECT * FROM products WHERE id=?").get(Number(item.id));
  const qty=Math.max(1,Math.min(20,Number(item.quantity)||1));
  if(!p || p.status==="sold_out" || p.status==="coming_soon" || p.status==="preorder" && p.stock<0)return res.status(400).json({error:"Один из товаров сейчас недоступен"});
  if(p.stock>0 && qty>p.stock)return res.status(400).json({error:`Недостаточно остатка: ${p.name}`});
  total+=p.price*qty; normalized.push({id:p.id,name:p.name,price:p.price,quantity:qty,image:p.image});
 }
 const orderNo="DC-"+Date.now().toString().slice(-8);
 const result=db.prepare(`INSERT INTO orders(order_number,customer_name,email,phone,country,city,postal_code,address,delivery,note,currency,total,items)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(orderNo,customer_name,email,phone,country,city,postal_code||"",address,delivery||"Standard",note||"",currency||"EUR",total,JSON.stringify(normalized));
 const update=db.prepare("UPDATE products SET stock=MAX(0,stock-?) WHERE id=? AND stock>0");
 for(const i of normalized) update.run(i.quantity,i.id);
 res.status(201).json({ok:true,order_number:orderNo,order_id:result.lastInsertRowid});
});
app.post("/api/admin/login",(req,res)=>{
 const {email,password}=req.body;
 const a=db.prepare("SELECT * FROM admins WHERE email=?").get(email||"");
 if(!a||!bcrypt.compareSync(password||"",a.password_hash))return res.status(401).json({error:"Неверный email или пароль"});
 req.session.admin={id:a.id,email:a.email};res.json({ok:true,email:a.email});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({admin:req.session.admin||null}));
app.get("/api/admin/orders",adminOnly,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(o=>({...o,items:JSON.parse(o.items||"[]")}))));
app.patch("/api/admin/orders/:id",adminOnly,(req,res)=>{
 const allowed=["new","processing","shipped","completed","cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:"Недопустимый статус"});
 db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);res.json({ok:true});
});
app.get("/api/admin/products",adminOnly,(req,res)=>res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all().map(safeProduct)));
app.post("/api/admin/products",adminOnly,(req,res)=>{
 const p=req.body;
 if(!p.name||!p.category)return res.status(400).json({error:"Название и категория обязательны"});
 const r=db.prepare(`INSERT INTO products(name,category,price,compare_price,stock,status,image,gallery,short_description,description,specs,featured)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name,p.category,Number(p.price)||0,Number(p.compare_price)||0,Number(p.stock)||0,p.status||"in_stock",p.image||"",JSON.stringify(p.gallery||[]),p.short_description||"",p.description||"",JSON.stringify(p.specs||{}),p.featured?1:0);
 res.status(201).json({id:r.lastInsertRowid});
});
app.put("/api/admin/products/:id",adminOnly,(req,res)=>{
 const p=req.body;
 db.prepare(`UPDATE products SET name=?,category=?,price=?,compare_price=?,stock=?,status=?,image=?,gallery=?,short_description=?,description=?,specs=?,featured=? WHERE id=?`)
 .run(p.name,p.category,Number(p.price)||0,Number(p.compare_price)||0,Number(p.stock)||0,p.status||"in_stock",p.image||"",JSON.stringify(p.gallery||[]),p.short_description||"",p.description||"",JSON.stringify(p.specs||{}),p.featured?1:0,req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/products/:id",adminOnly,(req,res)=>{
 db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
 res.json({ok:true});
});
app.get("/api/admin/reviews",adminOnly,(req,res)=>res.json(db.prepare("SELECT r.*,p.name product_name FROM reviews r LEFT JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC").all()));
app.patch("/api/admin/reviews/:id",adminOnly,(req,res)=>{
 if(req.body.visible!==undefined)db.prepare("UPDATE reviews SET visible=? WHERE id=?").run(req.body.visible?1:0,req.params.id);
 if(req.body.text!==undefined)db.prepare("UPDATE reviews SET text=? WHERE id=?").run(String(req.body.text).slice(0,2000),req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/reviews/:id",adminOnly,(req,res)=>{db.prepare("DELETE FROM reviews WHERE id=?").run(req.params.id);res.json({ok:true});});
app.post("/api/admin/upload",adminOnly,upload.single("image"),(req,res)=>{
 if(!req.file)return res.status(400).json({error:"Выберите изображение (JPG, PNG, WEBP, GIF до 8 МБ)"});
 res.json({url:"/uploads/"+req.file.filename});
});
app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT,()=>console.log(`DragonCore running at http://localhost:${PORT}`));
