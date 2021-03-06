const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const expressValidator = require('express-validator');
require('dotenv').config();

//import Routes
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const categoryRoutes = require('./routes/category')
const productRoutes = require('./routes/product')

//app
const app = express();

//db
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true
}).then(() => console.log('Database connected'))

//middlewares
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(expressValidator())
app.use(cors());

//routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', productRoutes);

const port = process.env.PORT || 8000;

// mongodb://<dbuser>:<dbpassword>@ds063168.mlab.com:63168/top10sales
// mongodb://127.0.0.1:27017/top10sales
//JWT_SECRET = jhfkjhdfkjhdkjfhkj

// app.set('port', process.env.PORT || 8000);

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});