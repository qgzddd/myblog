var fs = require('fs');
var path = require('path');
var sha1 = require('sha1');
var express = require('express');
var router = express.Router();

var UserModel = require('../models/users');
var checkLogin = require('../middlewares/check').checkLogin;
// GET /signup 注册页
router.get('/', checkLogin, function(req, res, next) {
  res.render('useredit');
});

// POST /useredit 用户修改
router.post('/', checkLogin, function(req, res, next) {
  var name = req.fields.name;
  var userid = req.session.user._id;
  var gender = req.fields.gender;
  var bio = req.fields.bio;
  var avatar = req.files.avatar.path.split(path.sep).pop();
  var password = req.fields.password;
  var repassword = req.fields.repassword;
  // 校验参数
  try {
    if (!(name.length >= 1 && name.length <= 10)) {
      throw new Error('名字请限制在 1-10 个字符');
    }
    if (['m', 'f', 'x'].indexOf(gender) === -1) {
      throw new Error('性别只能是 m、f 或 x');
    }
    if (!(bio.length >= 1 && bio.length <= 30)) {
      throw new Error('个人简介请限制在 1-30 个字符');
    }
    if (!req.files.avatar.name) {
      throw new Error('缺少头像');
    }
    if (password.length < 6) {
      throw new Error('密码至少 6 个字符');
    }
    if (password !== repassword) {
      throw new Error('两次输入密码不一致');
    }
  } catch (e) {
    // 注册失败，异步删除上传的头像
    fs.unlink(req.files.avatar.path);
    req.flash('error', e.message);
    return res.redirect('/useredit');
  }

  // 明文密码加密
  password = sha1(password);

  // 待写入数据库的用户信息
  var user = {
    name: name,
    password: password,
    gender: gender,
    bio: bio,
    avatar: avatar
  };
  // 用户信息写入数据库
  UserModel.updateUserById(userid, {name: name,password:password,avatar:avatar,gender:gender,bio:bio})
    .then(function () {
         var fileName=req.session.user.avatar;
       fs.unlink("./public/img/"+fileName);  
           req.session.user=null;
      req.flash('success', '个人资料修改成功,请重新登陆');

      //req.session.user.name=name;
      // 跳转到首页
  
   
      res.redirect('./posts');
    })
    .catch(function (e) {
      // 注册失败，异步删除上传的头像
      fs.unlink(req.files.avatar.path);
      // 用户名被占用则跳回注册页，而不是错误页
      if (e.message.match('E11000 duplicate key')) {
        req.flash('error', '用户名已被占用');
        return res.redirect('/useredit');
      }
      next(e);
    });
});
module.exports = router;