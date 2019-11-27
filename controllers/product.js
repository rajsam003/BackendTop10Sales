const multer = require('multer');
const _ = require('lodash');
const fs = require('fs');
const Product = require('../models/product');
const { errorHandler } = require('../helpers/dbErrorHandler')


var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

exports.upload = multer({ storage: storage });


exports.productById = (req, res, next, id) => {
    Product.findById(id)
        .populate('category')
        .exec((err, product) => {
            if (err || !product) {
                return res.status(400).json({
                    error: 'Product not found'
                })
            }
            req.product = product
            next();
        });
};

exports.read = (req, res) => {
    req.product.photo = undefined;
    return res.json(req.product);
}

exports.create = (req, res) => {

    if(!req.file){
        return res.status(400).json({
            status: 400,
            error: 'Image is not selected'
        })
    }

    if (req.file.size > 1000000) {
                return res.status(400).json({
                    status: 400,
                    error: 'Image should be less than 1mb in size'
                })
            }

    var requestFields = {
        name : req.body.name,
        brand : req.body.brand,
        type : req.body.type,
        description : req.body.description,
        specifications : req.body.specifications,
        pros : req.body.pros,
        cons : req.body.cons,
        overallRating : req.body.overallRating,
        category : req.body.category,
        amazonLink : req.body.amazonLink,
        photo : {
            data: fs.readFileSync(req.file.path),
            contentType : req.file.mimetype
        }
    }

    var product = new Product(requestFields);

        product.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    status: '400',
                    error: errorHandler(err)
                })
            }
            res.json({
                status: '200',
                result});
        })

}

exports.remove = (req, res) => {
    let product = req.product
    product.remove((err, deletedProduct) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            })
        }
        res.json({
            "message": 'Product deleted successfully'
        })
    })
};

exports.update = (req, res) => {
    let form = new formidable.IncomingForm()
    form.keepExtensions = true
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Image could not be uploaded'
            })
        }

        //check for all fields
        // const { brand, size, type, color, description, price, category, quantity, shipping } = fields

        // if (!brand || !size || !type || !color || !description || !price || !category || !quantity || !shipping) {
        //     return res.status(400).json({
        //         error: 'All fields are required'
        //     })
        // }

        let product = req.product;
        product = _.extend(product, fields)


        //1 kb = 1000
        //1 mb = 1000000

        if (files.photo) {
            if (files.photo.size > 1000000) {
                return res.status(400).json({
                    error: 'Image should be less than 1mb in size'
                })
            }
            product.photo.data = fs.readFileSync(files.photo.path)
            product.photo.contentType = files.photo.type
        }

        product.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                })
            }
            res.json(result);
        })
    })
}

/**
 * sell / arrival
 * by sell = /products?sortBy=sold&order=desc&limit=4
 * by arrival = /products?sortBy=createdAt&order=desc&limit=4
 * if no params are send the all are returned
 */

exports.list = (req, res) => {
    let order = req.query.order ? req.query.order : 'asc'
    let sortBy = req.query.sortBy ? req.query.sortBy : '_id'
    let limit = req.query.limit ? parseInt(req.query.limit) : 10

    Product.find()
        .select("-photo")
        .populate('category')
        .sort([[sortBy, order]])
        .limit(limit)
        .exec((err, products) => {
            if (err) {
                return res.status(400).json({
                    error: 'Products not found'
                })
            }
            res.json(products)
        })
}

/**
 * it will find the products based on the req product category
 * other products that has the same category will be returned
 */

exports.listRelated = (req, res) => {
    let limit = req.query.limit ? parseInt(req.query.limit) : 5;

    Product.find({ _id: { $ne: req.product }, category: req.product.category })
        .limit(limit)
        .populate('category', '_id name')
        .exec((err, products) => {
            if (err) {
                return res.status(400).json({
                    error: 'Products not found'
                })
            }
            res.json(products)
        })
}

exports.listCategories = (req, res) => {
    Product.distinct("category", {}, (err, categories) => {
        if (err) {
            return res.status(400).json({
                error: 'Categories not found'
            })
        }
        res.json(categories)
    })
}

/**
 * list products by search
 * we will implement product search in react frontend
 * we will show categories in checkbox and price range in radio buttons
 * as the user clicks on those checkbox and radio buttons
 * we will make api request and show the products to users based on what he wants
 */

// route - make sure its post 
exports.listBySearch = (req, res) => {
    let order = req.body.order ? req.body.order : "desc";
    let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
    let limit = req.body.limit ? parseInt(req.body.limit) : 100;
    let skip = parseInt(req.body.skip);
    let findArgs = {};

    // console.log(order, sortBy, limit, skip, req.body.filters);
    // console.log("findArgs", findArgs);

    for (let key in req.body.filters) {
        if (req.body.filters[key].length > 0) {
            if (key === "price") {
                // gte -  greater than price [0-10]
                // lte - less than
                findArgs[key] = {
                    $gte: req.body.filters[key][0],
                    $lte: req.body.filters[key][1]
                };
            } else {
                findArgs[key] = req.body.filters[key];
            }
        }
    }

    Product.find(findArgs)
        .select("-photo")
        .populate("category")
        .sort([[sortBy, order]])
        .skip(skip)
        .limit(limit)
        .exec((err, data) => {
            if (err) {
                return res.status(400).json({
                    error: "Products not found"
                });
            }
            res.json({
                size: data.length,
                data
            });
        });
};

exports.photo = (req, res, next) => {
    if (req.product.photo.data) {
        res.set('Content-Type', req.product.photo.contentType)
        return res.send(req.product.photo.data);
    }
    next();
};

exports.listSearch = (req, res) => {
    // create query object to hold search value and category value
    const query = {};
    // assign search value to query.name
    if (req.query.search) {
        query.category= { $regex: req.query.search, $options: "i" };
        // assigne category value to query.category
        if (req.query.category && req.query.category != "All") {
            query.category = req.query.category;
        }
        // find the product based on query object with 2 properties
        // search and category
        Product.find(query, (err, products) => {
            console.log('Inside find');
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(products);
        }).select("-photo");
    }
};

exports.decreaseQuantity = (req, res, next) => {
    let bulkOps = req.body.order.products.map((item) => {
        return {
            updateOne: {
                filter: { _id: item._id },
                update: { $inc: { quantity: -item.count, sold: +item.count } }
            }
        };
    });
    Product.bulkWrite(bulkOps, {}, (error, products) => {
        if (error) {
            return res.status(400).json({
                error: ' Could not update product'
            });
        }
        next();
    });
}
