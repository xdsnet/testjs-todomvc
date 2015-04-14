# 用 LeanCloud Javascript SDK 实现的 TodoMVC

[todolist.avosapps.com](http://todolist.avosapps.com/)，参考了 [JS SDK](http://leancloud.cn/docs/js_guide.html)

[LeanCloud 站点下载地址](http://download.leancloud.cn/demo/)

## 管理 Todos 
![img](https://github.com/leancloud/todo/blob/master/readme/todo.png)

## 登录与注册
![img](https://github.com/leancloud/todo/blob/master/readme/login.png)

## 本项目，你可以学到

* 如何将 JS SDK 用在前端，暴露了 `AppId` 或 `Appkey` 的时候，如何通过 ACL 权限控制，保护数据。
* 如何使用 `AV.View` 做交互多的界面
* 如何用 `AV.Router`、`AV.history` 来导航页面
* 如何将 Dom 的各种事件与 `AV.Object` 的函数相绑定，来实现数据与页面的大量交互

##安装

需要 [云代码命令行工具](http://blog.leancloud.cn/591/)，还可参考 [LeanCloud 本地调试云代码](http://blog.leancloud.cn/561/)

## TodoMVC

- https://github.com/tastejs/todomvc

## 通过 ACL 权限控制来保护数据
客户端的 `appId`、`appKey` 暴露了，看起来有心之人可以获取应用的所有数据，其实通过 ACL 管理可以避免这一点。
比如 todo 项，用户创建了 todo 项，良好的 ACL 管理在这个例子就是这个 todo 只能被这个用户读取和写入。

```
 todo.set('ACL',new AV.ACL(AV.User.current()));
```

所以当这个用户没有登录的时候，是不能读取这条数据的。用户的密码又是加密的。客户端无法获取。所以这时候读取和修改这条数据，要么是这个用户登录修改，要么是在管理台中。

另外，`_User` 默认的 ACL 控制是 `read:all, write:currentUser()`。也即所有情况下都可以读取的，但写入的话只能是这个用户。当这个用户没有登录的时候，尝试修改这个用户的数据会报异常。
