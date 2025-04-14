

const bcrypt = require('bcrypt');

const password = '123456';
const saltRounds = 10; // 推荐的盐的回合数，增加计算的复杂性

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
    } else {
        console.log("加密后的密码:", hash);
    }
});
