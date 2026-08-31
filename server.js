const express=require("express"), session=require("express-session"), bcrypt=require("bcryptjs"), Database=require("better-sqlite3"), path=require("path");
const app=express(), db=new Database("auvra.db");
app.use(express.json()); app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"change-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,password TEXT,role TEXT DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,price REAL,category TEXT,image TEXT,description TEXT,stock INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,name TEXT,phone TEXT,address TEXT,total REAL,status TEXT DEFAULT 'Pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,product_id INTEGER,name TEXT,price REAL,qty INTEGER);`);
const adminEmail=process.env.ADMIN_EMAIL||"admin@auvra.com", adminPass=process.env.ADMIN_PASSWORD||"ChangeMe123!";
if(!db.prepare("SELECT 1 FROM users WHERE email=?").get(adminEmail)) db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)").run("Auvra Admin",adminEmail,bcrypt.hashSync(adminPass,10),"admin");
if(db.prepare("SELECT COUNT(*) c FROM products").get().c===0){
 [["Wireless Earbuds",999,"Electronics","https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80","Wireless earbuds",12],
 ["Cotton T-Shirt",499,"Fashion","https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80","Comfortable everyday T-shirt",20],
 ["Backpack",799,"Bags","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80","Everyday backpack",8]]
 .forEach(p=>db.prepare("INSERT INTO products(name,price,category,image,description,stock) VALUES(?,?,?,?,?,?)").run(...p));
}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:"Login required"});next()}
function admin(req,res,next){if(!req.session.user||req.session.user.role!=="admin")return res.status(403).json({error:"Admin only"});next()}
app.get("/api/products",(req,res)=>res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all()));
app.get("/api/me",(req,res)=>res.json(req.session.user||null));
app.post("/api/signup",(req,res)=>{try{let {name,email,password}=req.body;if(!name||!email||!password||password.length<6)return res.status(400).json({error:"Name, email and 6+ character password required"});let hash=bcrypt.hashSync(password,10),x=db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name,email,hash);req.session.user={id:x.lastInsertRowid,name,email,role:"customer"};res.json(req.session.user)}catch(e){res.status(400).json({error:"Email already registered"})}});
app.post("/api/login",(req,res)=>{let u=db.prepare("SELECT * FROM users WHERE email=?").get(req.body.email);if(!u||!bcrypt.compareSync(req.body.password,u.password))return res.status(401).json({error:"Invalid login"});req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};res.json(req.session.user)});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.post("/api/orders",auth,(req,res)=>{try{let {name,phone,address,items}=req.body;if(!name||!phone||!address||!Array.isArray(items)||!items.length)return res.status(400).json({error:"Complete checkout details required"});let get=db.prepare("SELECT * FROM products WHERE id=?"), total=0, checked=[];for(const it of items){let p=get.get(it.id);let q=Math.max(1,Math.floor(it.qty));if(!p||p.stock<q)throw Error("Stock unavailable");total+=p.price*q;checked.push({p,q})}
db.exec("BEGIN");let o=db.prepare("INSERT INTO orders(user_id,name,phone,address,total) VALUES(?,?,?,?,?)").run(req.session.user.id,name,phone,address,total);
for(const x of checked){db.prepare("INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES(?,?,?,?,?)").run(o.lastInsertRowid,x.p.id,x.p.name,x.p.price,x.q);db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(x.q,x.p.id)}
db.exec("COMMIT");res.json({id:o.lastInsertRowid,total,status:"Pending",payment:"COD"});}catch(e){try{db.exec("ROLLBACK")}catch(_){}res.status(400).json({error:e.message})}});
app.get("/api/orders",auth,(req,res)=>res.json(db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC").all(req.session.user.id)));
app.post("/api/products",admin,(req,res)=>{let {name,price,category,image,description,stock}=req.body;if(!name||price<0)return res.status(400).json({error:"Invalid product"});let x=db.prepare("INSERT INTO products(name,price,category,image,description,stock) VALUES(?,?,?,?,?,?)").run(name,+price,category||"General",image||"",description||"",+stock||0);res.json(db.prepare("SELECT * FROM products WHERE id=?").get(x.lastInsertRowid))});
app.delete("/api/products/:id",admin,(req,res)=>{db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);res.json({ok:true})});
app.get("/api/admin/orders",admin,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all()));
app.patch("/api/admin/orders/:id",admin,(req,res)=>{let allowed=["Pending","Confirmed","Shipped","Delivered","Cancelled"];if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);res.json({ok:true})});
app.use(express.static(path.join(__dirname,"public")));
app.listen(process.env.PORT||3000,()=>console.log("Auvra running on http://localhost:"+(process.env.PORT||3000)));