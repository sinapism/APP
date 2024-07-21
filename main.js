const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const db = require('./database.js');

let win;
let winlogin;

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'index.js')
        }
    });

    win.loadFile('index.html');

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes("Autofill")) {
            event.preventDefault();
        }
    });
}

function loginWindow() {
    winlogin = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'login.js')
        }
    });

    winlogin.loadFile('login.html');
}

app.whenReady().then(loginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('login', (event, obj) => {
    validatelogin(obj);
});

function validatelogin(obj) {
    const { username, password } = obj;
    const sql = "SELECT * FROM user WHERE username=? AND password=?";
    db.get(sql, [username, password], (error, result) => {
        if (error) {
            console.log(error);
            return;
        }

        if (result) {
            createWindow();
            win.show();
            winlogin.close();
        } else {
            new Notification({
                title: "Login",
                body: 'Username or password incorrect'
            }).show();
        }
    });
}

ipcMain.handle('get', async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM product', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
                win.webContents.send('products', rows);
            }
        });
    });
});

ipcMain.handle('add', async (event, obj) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO product (name, price) VALUES (?, ?)';
        db.run(sql, [obj.name, obj.price], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
                getProducts();
            }
        });
    });
});

ipcMain.handle('get_one', async (event, obj) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM product WHERE id = ?', [obj.id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
                win.webContents.send('product', row);
            }
        });
    });
});

ipcMain.handle('remove_product', async (event, obj) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM product WHERE id = ?';
        db.run(sql, [obj.id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
                getProducts();
            }
        });
    });
});

ipcMain.handle('update', async (event, obj) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE product SET name = ?, price = ? WHERE id = ?';
        db.run(sql, [obj.name, obj.price, obj.id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
                getProducts();
            }
        });
    });
});

function getProducts() {
    db.all('SELECT * FROM product', (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            win.webContents.send('products', rows);
        }
    });
}

function addProduct(obj) {
    const sql = "INSERT INTO product (name, price) VALUES (?, ?)";
    db.run(sql, [obj.name, obj.price], (error, results) => {
        if (error) {
            console.log(error);
        }
        getProducts();
    });
}

function deleteproduct(obj) {
    const { id } = obj;
    const sql = "DELETE FROM product WHERE id = ?";
    db.run(sql, [id], (error, results) => {
        if (error) {
            console.log(error);
        }
        getProducts();
    });
}

function getproduct(obj) {
    const { id } = obj;
    const sql = "SELECT * FROM product WHERE id = ?";
    db.get(sql, [id], (error, result) => {
        if (error) {
            console.log(error);
        }
        win.webContents.send('product', result);
    });
}

function updateproduct(obj) {
    const { id, name, price } = obj;
    const sql = "UPDATE product SET name=?, price=? WHERE id=?";
    db.run(sql, [name, price, id], (error, results) => {
        if (error) {
            console.log(error);
        }
        getProducts();
    });
}
