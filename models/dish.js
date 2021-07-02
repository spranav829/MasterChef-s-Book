const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review');
const Dish = new Schema({
    title: {
        type: String,
        required: true
    },
    image: String,
    description: String,
    category: String,
    steps: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});
Dish.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.remove({
            _id: {
                $in: doc.reviews
            }
        })
    }
})
module.exports = mongoose.model('Dish', Dish);