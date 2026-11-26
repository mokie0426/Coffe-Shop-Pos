const STORAGE_KEY = 'cafe_pos_enhanced_v2';
const $ = id => document.getElementById(id);
const peso = value => '₱' + Number(value || 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateKey = date => { const d = date ? new Date(date) : new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const seedProducts = [
  {id:1,name:'Iced Spanish Latte',category:'Coffee',price:120,stock:40,emoji:'🧋'},
  {id:2,name:'Iced Matcha',category:'Non-Coffee',price:130,stock:25,emoji:'🍵'},
  {id:3,name:'Caramel Macchiato',category:'Coffee',price:125,stock:35,emoji:'☕'},
  {id:4,name:'Americano',category:'Coffee',price:90,stock:50,emoji:'🖤'},
  {id:5,name:'Cafe Latte',category:'Coffee',price:110,stock:40,emoji:'🥛'},
  {id:6,name:'Chocolate',category:'Non-Coffee',price:115,stock:20,emoji:'🍫'},
  {id:7,name:'Blueberry Muffin',category:'Pastry',price:75,stock:18,emoji:'🧁'}
];
const defaultState = () => ({
  account:null, products:seedProducts, orders:[],
  settings:{shopName:'Café POS',address:'',phone:'',footer:'Thank you for supporting our shop!',lowStock:5}
});
let state = loadState(), cart = [], selectedPayment = 'Cash', activeUser = '';
function loadState(){
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(saved) return {...defaultState(),...saved,settings:{...defaultState().settings,...saved.settings},products:saved.products||seedProducts,orders:saved.orders||[]}; } catch(e){}
  return defaultState();
}
function persist(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function toast(message){ const node=document.createElement('div');node.className='toast';node.textContent=message;$('toastRoot').append(node);setTimeout(()=>node.remove(),2600); }
function showPage(page){
  document.querySelectorAll('.page').forEach(el=>el.classList.add('hidden'));
  $('page-'+page).classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
  if(page==='dashboard')renderDashboard();
  if(page==='pos')renderPOS();
  if(page==='products')renderProducts();
  if(page==='inventory')renderInventory();
  if(page==='orders')renderOrders();
  if(page==='reports')renderReports();
  if(page==='settings')fillSettings();
}
document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.goto)));

function initLogin(){
  const first=!state.account;
  $('firstRunNote').classList.toggle('hidden',!first);
  $('loginButton').textContent=first?'Create account & sign in':'Log in';
  $('loginDescription').textContent=first?'Set up your username and password':'Sign in to continue';
  $('loginShopName').textContent=state.settings.shopName||'Café POS';
}
$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const username=$('loginUsername').value.trim(),password=$('loginPassword').value;
  if(!username||!password)return;
  if(!state.account){state.account={username,password};persist();enterApp(username);return;}
  if(username===state.account.username && password===state.account.password){enterApp(username);}
  else $('loginError').textContent='Username or password is incorrect.';
});
function enterApp(username){
  activeUser=username;$('loginScreen').classList.add('hidden');$('appShell').classList.remove('hidden');
  $('signedInUser').textContent='Signed in as '+username;refreshHeader();showPage('dashboard');
}
function refreshHeader(){$('headerShopName').textContent=state.settings.shopName;$('loginShopName').textContent=state.settings.shopName;}
$('logoutButton').onclick=()=>{cart=[];$('appShell').classList.add('hidden');$('loginScreen').classList.remove('hidden');$('loginPassword').value='';$('loginError').textContent='';initLogin();};
function refreshAll(){refreshHeader();renderDashboard();renderProducts();renderInventory();renderOrders();renderPOS();renderReports();}

function renderDashboard(){
  const today=state.orders.filter(order=>order.dateKey===dateKey());
  const sum=arr=>arr.reduce((total,item)=>total+item.total,0);
  $('statTodaySales').textContent=peso(sum(today));$('statTodayOrders').textContent=`${today.length} completed orders`;
  $('statTodayCount').textContent=today.length;$('statProducts').textContent=state.products.length;
  $('statLowStock').textContent=`${state.products.filter(p=>p.stock<=Number(state.settings.lowStock)).length} low-stock items`;
  $('statAllSales').textContent=peso(sum(state.orders));$('statAllOrders').textContent=`${state.orders.length} total orders`;
  $('dashboardRecent').innerHTML=state.orders.length?`<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>${state.orders.slice(0,6).map(o=>`<tr><td>#${safe(o.id)}</td><td>${safe(o.customer)}</td><td>${safe(o.payment)}</td><td><b>${peso(o.total)}</b></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-row">No sales yet. Your completed orders will appear here.</div>';
  const counts={};state.orders.forEach(o=>o.items.forEach(i=>counts[i.name]=(counts[i.name]||0)+i.qty));
  const popular=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $('popularProducts').innerHTML=popular.length?popular.map(([name,qty])=>`<div class="dashboard-popular"><span>${safe(name)}</span><b>${qty} sold</b></div>`).join(''):'<div class="empty-row">Product rankings appear after sales.</div>';
}

function categories(){return [...new Set(state.products.map(p=>p.category||'Other'))].sort();}
function renderCategoryFilter(){
  const current=$('categoryFilter').value||'all';
  $('categoryFilter').innerHTML='<option value="all">All categories</option>'+categories().map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join('');
  $('categoryFilter').value=categories().includes(current)?current:'all';
}
function renderPOS(){
  renderCategoryFilter();
  const term=$('productSearch').value.toLowerCase(),category=$('categoryFilter').value;
  const list=state.products.filter(p=>(p.name.toLowerCase().includes(term)||p.category.toLowerCase().includes(term))&&(category==='all'||p.category===category));
  $('menuCount').textContent=`${state.products.length} items`;
  $('posProducts').innerHTML=list.length?list.map(p=>`<button class="product-tile" data-add-product="${p.id}" ${p.stock<=0?'disabled':''}><span class="product-emoji">${safe(p.emoji||'☕')}</span><strong>${safe(p.name)}</strong><span class="product-category">${safe(p.category)}</span><span class="product-price">${peso(p.price)}</span><span class="stock-hint">${p.stock<=0?'Sold out':p.stock+' left'}</span></button>`).join(''):'<div class="empty-row">No matching products.</div>';
  document.querySelectorAll('[data-add-product]').forEach(btn=>btn.onclick=()=>addToCart(Number(btn.dataset.addProduct)));
  renderCart();
}
$('productSearch').addEventListener('input',renderPOS);$('categoryFilter').addEventListener('change',renderPOS);
function addToCart(id){
  const product=state.products.find(p=>p.id===id);if(!product||product.stock<=0)return;
  const existing=cart.find(item=>item.id===id),qty=existing?.qty||0;
  if(qty>=product.stock){toast('Not enough stock available.');return;}
  if(existing)existing.qty++;else cart.push({...product,qty:1});
  renderCart();
}
function changeQty(id,delta){
  const row=cart.find(item=>item.id===id);if(!row)return;
  const product=state.products.find(p=>p.id===id);
  if(delta>0 && row.qty>=product.stock){toast('Not enough stock available.');return;}
  row.qty+=delta;cart=cart.filter(item=>item.qty>0);renderCart();
}
function subtotal(){return cart.reduce((sum,item)=>sum+item.price*item.qty,0);}
function discount(){return Math.min(Math.max(0,Number($('discountInput').value)||0),subtotal());}
function totalDue(){return Math.max(0,subtotal()-discount());}
function renderCart(){
  $('cartList').innerHTML=cart.length?cart.map(item=>`<div class="cart-item"><div><div class="cart-item-name">${safe(item.name)}</div><div class="cart-item-price">${peso(item.price)} each</div></div><div class="cart-item-right"><div class="cart-item-line">${peso(item.price*item.qty)}</div><div class="qty-controls"><button data-qty-minus="${item.id}" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button data-qty-plus="${item.id}" aria-label="Increase quantity">+</button></div></div></div>`).join(''):'<div class="empty-state">Your order is empty.<br><span class="muted tiny">Select a product from the menu.</span></div>';
  document.querySelectorAll('[data-qty-minus]').forEach(b=>b.onclick=()=>changeQty(Number(b.dataset.qtyMinus),-1));
  document.querySelectorAll('[data-qty-plus]').forEach(b=>b.onclick=()=>changeQty(Number(b.dataset.qtyPlus),1));
  $('cartSubtotal').textContent=peso(subtotal());$('cartDiscount').textContent='−'+peso(discount());$('cartTotal').textContent=peso(totalDue());
  $('cashFields').classList.toggle('hidden',selectedPayment!=='Cash');
  $('cashChange').textContent=peso(Math.max(0,(Number($('cashReceived').value)||0)-totalDue()));
  $('completeSaleButton').disabled=cart.length===0;
}
$('clearCartButton').onclick=()=>{cart=[];$('discountInput').value=0;$('cashReceived').value='';renderCart();};
$('discountInput').addEventListener('input',renderCart);$('cashReceived').addEventListener('input',renderCart);
$('paymentOptions').addEventListener('click',event=>{
  const btn=event.target.closest('[data-payment]');if(!btn)return;
  selectedPayment=btn.dataset.payment;
  document.querySelectorAll('.payment-option').forEach(el=>el.classList.toggle('selected',el===btn));renderCart();
});
$('completeSaleButton').onclick=()=>{
  if(!cart.length)return;
  const total=totalDue(),cash=Number($('cashReceived').value)||0;
  if(selectedPayment==='Cash'&&cash<total){toast('Cash received is less than the total due.');return;}
  for(const item of cart){const p=state.products.find(x=>x.id===item.id);if(!p||p.stock<item.qty){toast(`Insufficient stock for ${item.name}.`);return;}}
  const order={id:String(Date.now()).slice(-8),date:new Date().toISOString(),dateKey:dateKey(),customer:$('customerName').value.trim()||'Walk-in',items:cart.map(i=>({...i})),subtotal:subtotal(),discount:discount(),total,payment:selectedPayment,cash:selectedPayment==='Cash'?cash:null,change:selectedPayment==='Cash'?cash-total:0};
  order.items.forEach(item=>{const product=state.products.find(p=>p.id===item.id);product.stock-=item.qty;});
  state.orders.unshift(order);persist();cart=[];$('customerName').value='';$('discountInput').value=0;$('cashReceived').value='';renderCart();refreshAll();showReceipt(order);toast('Sale completed and saved.');
};

function renderProducts(){
  const term=($('manageProductSearch').value||'').toLowerCase();
  const products=state.products.filter(p=>p.name.toLowerCase().includes(term)||p.category.toLowerCase().includes(term));
  $('productTableCount').textContent=`${products.length} products`;
  $('productsTable').innerHTML=products.length?products.map(p=>`<tr><td><b>${safe(p.emoji||'☕')} ${safe(p.name)}</b></td><td>${safe(p.category)}</td><td>${peso(p.price)}</td><td>${p.stock}</td><td>${stockBadge(p.stock)}</td><td><div class="action-group"><button class="icon-btn" data-edit-product="${p.id}">Edit</button><button class="icon-btn delete" data-delete-product="${p.id}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty-row">No products found.</td></tr>';
  document.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>openProductModal(Number(b.dataset.editProduct)));
  document.querySelectorAll('[data-delete-product]').forEach(b=>b.onclick=()=>deleteProduct(Number(b.dataset.deleteProduct)));
}
$('manageProductSearch').addEventListener('input',renderProducts);
function stockBadge(stock){if(stock<=0)return '<span class="badge out">Out of stock</span>';if(stock<=Number(state.settings.lowStock))return '<span class="badge low">Low stock</span>';return '<span class="badge good">In stock</span>';}
$('addProductButton').onclick=()=>openProductModal();
function openProductModal(id=null){
  const product=id?state.products.find(p=>p.id===id):{name:'',category:'Coffee',price:'',stock:0,emoji:'☕'};
  $('modalRoot').innerHTML=`<div class="modal-backdrop"><form class="modal" id="productForm"><h2>${id?'Edit product':'Add a product'}</h2><div class="field"><label for="modalProductName">Product name</label><input id="modalProductName" maxlength="70" required value="${safe(product.name)}"></div><div class="field"><label for="modalProductCategory">Category</label><input id="modalProductCategory" maxlength="35" required value="${safe(product.category)}" placeholder="Coffee, Tea, Pastry…"></div><div class="field"><label for="modalProductPrice">Price (₱)</label><input id="modalProductPrice" type="number" min=".01" step=".01" required value="${safe(product.price)}"></div><div class="field"><label for="modalProductStock">Stock quantity</label><input id="modalProductStock" type="number" min="0" step="1" required value="${safe(product.stock)}"></div><div class="field"><label for="modalProductEmoji">Emoji</label><input id="modalProductEmoji" maxlength="6" value="${safe(product.emoji||'☕')}"></div><div class="modal-actions"><button class="btn primary">Save product</button><button class="btn soft" type="button" id="cancelProductModal">Cancel</button></div></form></div>`;
  $('cancelProductModal').onclick=closeModal;
  $('productForm').onsubmit=event=>{
    event.preventDefault();
    const item={id:id||Date.now(),name:$('modalProductName').value.trim(),category:$('modalProductCategory').value.trim(),price:Number($('modalProductPrice').value),stock:Number($('modalProductStock').value),emoji:$('modalProductEmoji').value.trim()||'☕'};
    if(!item.name||!item.category||item.price<=0||item.stock<0)return;
    if(id)state.products=state.products.map(p=>p.id===id?item:p);else state.products.push(item);
    persist();closeModal();refreshAll();toast('Product saved.');
  };
}
function deleteProduct(id){
  const product=state.products.find(p=>p.id===id);if(!product)return;
  if(!confirm(`Delete "${product.name}" from the menu? Past order records will remain.`))return;
  state.products=state.products.filter(p=>p.id!==id);cart=cart.filter(i=>i.id!==id);persist();refreshAll();toast('Product deleted.');
}
function renderInventory(){
  const units=state.products.reduce((s,p)=>s+p.stock,0),low=state.products.filter(p=>p.stock>0&&p.stock<=Number(state.settings.lowStock)).length,out=state.products.filter(p=>p.stock===0).length;
  $('inventoryUnits').textContent=units;$('inventoryLow').textContent=low;$('inventoryOut').textContent=out;
  $('inventoryTable').innerHTML=state.products.length?state.products.map(p=>`<tr><td><b>${safe(p.emoji||'☕')} ${safe(p.name)}</b><br><span class="muted tiny">${safe(p.category)}</span></td><td><b>${p.stock}</b> units</td><td>${stockBadge(p.stock)}</td><td><div class="action-group"><button class="icon-btn" data-stock-adjust="${p.id}" data-delta="-1">−1</button><button class="icon-btn" data-stock-adjust="${p.id}" data-delta="1">+1</button><button class="icon-btn" data-stock-set="${p.id}">Set</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="empty-row">No products in inventory.</td></tr>';
  document.querySelectorAll('[data-stock-adjust]').forEach(b=>b.onclick=()=>{const p=state.products.find(x=>x.id===Number(b.dataset.stockAdjust));p.stock=Math.max(0,p.stock+Number(b.dataset.delta));persist();renderInventory();renderProducts();renderPOS();renderDashboard();});
  document.querySelectorAll('[data-stock-set]').forEach(b=>b.onclick=()=>{const p=state.products.find(x=>x.id===Number(b.dataset.stockSet));const value=prompt(`Set stock quantity for ${p.name}:`,p.stock);if(value===null)return;const n=Number(value);if(!Number.isInteger(n)||n<0){toast('Enter a valid whole number.');return;}p.stock=n;persist();refreshAll();});
}

function renderOrders(){
  const term=($('orderSearch').value||'').toLowerCase(),date=$('orderDateFilter').value;
  const orders=state.orders.filter(o=>(!date||o.dateKey===date)&&[o.id,o.customer,o.payment].join(' ').toLowerCase().includes(term));
  $('ordersTable').innerHTML=orders.length?orders.map(o=>`<tr><td><b>#${safe(o.id)}</b></td><td>${new Date(o.date).toLocaleString()}</td><td>${safe(o.customer)}</td><td>${safe(o.payment)}</td><td><b>${peso(o.total)}</b></td><td><button class="icon-btn" data-receipt="${safe(o.id)}">View / print</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty-row">No matching orders.</td></tr>';
  document.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>{const order=state.orders.find(o=>o.id===b.dataset.receipt);if(order)showReceipt(order);});
}
$('orderSearch').addEventListener('input',renderOrders);$('orderDateFilter').addEventListener('change',renderOrders);

function filteredReportOrders(){
  const period=$('reportPeriod').value,now=new Date();
  return state.orders.filter(o=>{
    if(period==='all')return true;
    if(period==='today')return o.dateKey===dateKey();
    const days=Number(period),d=new Date(o.date);const start=new Date(now);start.setDate(start.getDate()-(days-1));start.setHours(0,0,0,0);return d>=start&&d<=now;
  });
}
function renderReports(){
  const orders=filteredReportOrders(),sales=orders.reduce((s,o)=>s+o.total,0),items=orders.reduce((s,o)=>s+o.items.reduce((a,i)=>a+i.qty,0),0);
  $('reportSales').textContent=peso(sales);$('reportOrders').textContent=orders.length;$('reportItems').textContent=items;$('reportAverage').textContent=peso(orders.length?sales/orders.length:0);
  const payments={};orders.forEach(o=>payments[o.payment]=(payments[o.payment]||0)+o.total);
  const rows=Object.entries(payments).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...rows.map(x=>x[1]));
  $('paymentBreakdown').innerHTML=rows.length?rows.map(([name,value])=>`<div class="breakdown-row"><b>${safe(name)}</b><div class="bar-track"><div class="bar-fill" style="width:${value/max*100}%"></div></div><strong>${peso(value)}</strong></div>`).join(''):'<div class="empty-row">No payments recorded in this period.</div>';
}
$('reportPeriod').addEventListener('change',renderReports);

function fillSettings(){
  $('settingShopName').value=state.settings.shopName||'';$('settingAddress').value=state.settings.address||'';
  $('settingPhone').value=state.settings.phone||'';$('settingFooter').value=state.settings.footer||'';
  $('lowStockThreshold').value=state.settings.lowStock??5;
}
$('saveSettingsButton').onclick=()=>{
  state.settings={shopName:$('settingShopName').value.trim()||'Coffee Shop',address:$('settingAddress').value.trim(),phone:$('settingPhone').value.trim(),footer:$('settingFooter').value.trim(),lowStock:Math.max(0,Number($('lowStockThreshold').value)||0)};
  persist();refreshAll();toast('Shop settings saved.');
};
$('updateAccountButton').onclick=()=>{
  const username=$('changeUsername').value.trim(),old=$('oldPassword').value,newPassword=$('changePassword').value;
  if(old!==state.account?.password){toast('Current password is incorrect.');return;}
  if(!username||!newPassword){toast('Enter a new username and password.');return;}
  state.account={username,password:newPassword};activeUser=username;persist();$('signedInUser').textContent='Signed in as '+username;
  ['changeUsername','oldPassword','changePassword'].forEach(id=>$(id).value='');toast('Login updated.');
};

function receiptMarkup(order){
  const itemRows=order.items.map(item=>`<div class="receipt-line"><span>${safe(item.name)} × ${item.qty}</span><b>${peso(item.price*item.qty)}</b></div>`).join('');
  return `<div class="receipt-paper" id="receiptPaper"><h2>${safe(state.settings.shopName)}</h2><div class="receipt-center">${safe(state.settings.address)}<br>${safe(state.settings.phone)}</div><div class="receipt-rule"></div><b>RECEIPT #${safe(order.id)}</b><br>${new Date(order.date).toLocaleString()}<br>Customer: ${safe(order.customer)}<div class="receipt-rule"></div>${itemRows}<div class="receipt-rule"></div><div class="receipt-line"><span>Subtotal</span><b>${peso(order.subtotal??order.total)}</b></div><div class="receipt-line"><span>Discount</span><b>−${peso(order.discount||0)}</b></div><div class="receipt-line" style="font-size:15px;margin-top:6px"><b>TOTAL</b><b>${peso(order.total)}</b></div><br>Payment: ${safe(order.payment)}${order.payment==='Cash'?`<br>Cash: ${peso(order.cash)}<br>Change: ${peso(order.change)}`:''}<div class="receipt-rule"></div><div class="receipt-center">${safe(state.settings.footer||'Thank you!')}</div></div>`;
}
function showReceipt(order){
  $('modalRoot').innerHTML=`<div class="modal-backdrop" id="receiptBackdrop"><div class="modal"><h2>Receipt · #${safe(order.id)}</h2>${receiptMarkup(order)}<div class="receipt-actions"><button class="btn primary" id="printReceiptButton">Print</button><button class="btn soft" id="saveReceiptButton">Save PNG</button></div><p class="notice-inline">PNG downloads to your device. On a phone, use your browser's download/share options to save it to Photos or Gallery.</p><button class="btn ghost full" id="closeReceiptButton">Close</button></div></div>`;
  $('closeReceiptButton').onclick=closeModal;$('receiptBackdrop').onclick=e=>{if(e.target.id==='receiptBackdrop')closeModal();};
  $('printReceiptButton').onclick=printReceipt;
  $('saveReceiptButton').onclick=()=>saveReceiptPng(order);
}
function closeModal(){$('modalRoot').innerHTML='';}
function printReceipt(){
  const old=$('printRoot');if(old)old.remove();
  const node=document.createElement('div');node.id='printRoot';node.innerHTML=$('receiptPaper').outerHTML;document.body.append(node);
  window.print();setTimeout(()=>node.remove(),800);
}
function saveReceiptPng(order){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const lines=[state.settings.shopName,state.settings.address,state.settings.phone,'--------------------------------',`RECEIPT #${order.id}`,new Date(order.date).toLocaleString(),`Customer: ${order.customer}`,'--------------------------------',...order.items.flatMap(i=>[i.name,`${i.qty} x ${peso(i.price)} = ${peso(i.price*i.qty)}`]),'--------------------------------',`Subtotal: ${peso(order.subtotal??order.total)}`,`Discount: ${peso(order.discount||0)}`,`TOTAL: ${peso(order.total)}`,`Payment: ${order.payment}`,...(order.payment==='Cash'?[`Cash: ${peso(order.cash)}`,`Change: ${peso(order.change)}`]:[]),'--------------------------------',state.settings.footer];
  const width=720,lineHeight=31,pad=35;canvas.width=width;canvas.height=pad*2+lines.length*lineHeight;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#201811';ctx.textAlign='center';ctx.font='bold 30px Georgia';ctx.fillText(lines[0],width/2,48);ctx.font='18px monospace';
  lines.slice(1).forEach((line,i)=>ctx.fillText(String(line).slice(0,65),width/2,88+i*lineHeight));
  const link=document.createElement('a');link.download=`receipt-${order.id}.png`;link.href=canvas.toDataURL('image/png');link.click();toast('Receipt PNG downloaded.');
}

function csvEscape(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
function downloadCSV(filename,rows){
  const csv=rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function ordersToCSV(orders){
  const rows=[['Order ID','Date','Customer','Payment','Subtotal','Discount','Total','Items']];
  orders.forEach(o=>rows.push([o.id,new Date(o.date).toLocaleString(),o.customer,o.payment,o.subtotal??o.total,o.discount||0,o.total,o.items.map(i=>`${i.name} x${i.qty}`).join('; ')]));
  return rows;
}
$('exportOrdersButton').onclick=()=>downloadCSV('coffee-shop-orders.csv',ordersToCSV(state.orders));
$('reportCsvButton').onclick=()=>downloadCSV('coffee-shop-sales-report.csv',ordersToCSV(filteredReportOrders()));
$('exportAllCsvButton').onclick=()=>downloadCSV('coffee-shop-all-orders.csv',ordersToCSV(state.orders));
$('backupButton').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='coffee-shop-backup.json';a.click();URL.revokeObjectURL(url);toast('Backup downloaded.');
};
$('restoreInput').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data||!Array.isArray(data.products)||!Array.isArray(data.orders)||!data.settings)throw new Error('Invalid backup');
    if(!confirm('Restore this backup? It will replace the current shop data.'))return;
    state={...defaultState(),...data,settings:{...defaultState().settings,...data.settings}};
    persist();cart=[];refreshAll();initLogin();toast('Backup restored. Please log in again if needed.');
    $('appShell').classList.add('hidden');$('loginScreen').classList.remove('hidden');
  }catch(error){toast('Could not restore. Check that this is a valid backup file.');}
  event.target.value='';
});
$('resetButton').onclick=()=>{
  if(!confirm('Delete this app account, products, and all saved sales from this browser? Download a backup first if needed.'))return;
  localStorage.removeItem(STORAGE_KEY);location.reload();
};

initLogin();
