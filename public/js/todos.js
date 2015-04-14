// An example AV.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses AV to persist
// the todo items and provide user authentication and sessions.


$(function() {

  AV.$ = jQuery;

  //用config.js中的appId，appKey初始化，若你搭建自己的Todo，请用你的appId与appKey
  AV.initialize(appId, appKey);

  // Todo Model
  // ----------

  // 我们的 Todo 模型有 `content`, `order`, and `done`属性
  var Todo = AV.Object.extend("Todo", {
    // Default attributes for the todo.
    defaults: {
      content: "空 todo...",
      done: false
    },

    // 确保每个Todo都有`content`
    initialize: function() {
      if (!this.get("content")) {
        this.set({"content": this.defaults.content});
      }
    },

    // 切换 `done`状态
    toggle: function() {
      this.save({done: !this.get("done")});
    }
  });

    // 这个是暂态的状态，并没有保存在AV的数据库中
  var AppState = AV.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  // Todo Collection
  // ---------------

  var TodoList = AV.Collection.extend({

    //引用 这个集合的model
    model: Todo,

    //过滤出所有完成的Todo
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    //过滤出所有没有完成的Todo
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    //我们让Todos保持一定的顺序，尽管保存在数据库的objectId是无序、全局唯一的。下面的函数产生了下一个序号
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    //Todos会根据它们的`order`值来排序
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // Todo Item View
  // --------------

  // 一个Todo的 DOM 元素节点
  var TodoView = AV.View.extend({

    //是一个list 的tag
    tagName:  "li",

    //加载index.html的节点 #item-template ，作为模板，为后续填充数据作准备
    template: _.template($('#item-template').html()),

    // 一个列表项特定的 DOM 事件
    events: {
      "click .toggle"              : "toggleDone",
      "dblclick label.todo-content" : "edit",
      "click .todo-destroy"   : "clear",
      "keypress .edit"      : "updateOnEnter",
      "blur .edit"          : "close"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render', 'close', 'remove');
      this.model.bind('change', this.render);
      this.model.bind('destroy', this.remove);
    },

    // 渲染一个 todo 项
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.input = this.$('.edit');
      return this;
    },

    //切换 model的 `done` 状态
    toggleDone: function() {
      this.model.toggle();
    },

    // 切换这个view为编辑模式，显示输入框
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },

    // 关闭编辑模式，保存内容到 todo 中
    close: function() {
      this.model.save({content: this.input.val()});
      $(this.el).removeClass("editing");
    },

    // 如果敲了回车键，将退出编辑模式
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // 删除一个 列表项 ，同时删除 todo model
    clear: function() {
      this.model.destroy();
    }

  });

  // The Application
  // ---------------

  // 给用户编辑 todo 主体视图
  var ManageTodosView = AV.View.extend({

    // 底部的统计数据展现所用到的模板
    statsTemplate: _.template($('#stats-template').html()),

    // 创建新的 todo 或者清空已完成的那些，所需要触发的事件
    events: {
      "keypress #new-todo":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete",
      "click .log-out": "logOut",
      "click ul#filters a": "selectFilter"
    },

    el: ".content",

    // 初始化的时候我们把跟 Todos 集合 相关的函数绑定到这个view上，同时加载
    // 这个用户的Todos

    initialize: function() {
      var self = this;

      _.bindAll(this, 'addOne', 'addAll', 'addSome', 'render', 'toggleAllComplete', 'logOut', 'createOnEnter');

      // 主体管理 todo 的html模板
      this.$el.html(_.template($("#manage-todos-template").html()));
      
      this.input = this.$("#new-todo");
      this.allCheckbox = this.$("#toggle-all")[0];

      // 创建我们的 Todos 集合
      this.todos = new TodoList;

      // 创建 query ，来查询该用户的 todos
      this.todos.query = new AV.Query(Todo);
      this.todos.query.equalTo("user", AV.User.current());
        
      this.todos.bind('add',     this.addOne);
      this.todos.bind('reset',   this.addAll);
      this.todos.bind('all',     this.render);

      // 获取该用户的所有 todo项
      this.todos.fetch();

      state.on("change", this.filter, this);
    },

    // 注销，然后显示登录注册 视图
    logOut: function(e) {
      AV.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    // 每一次 todo 列表有变化时，意味着底部的统计视图也要跟随着改变
    render: function() {
      var done = this.todos.done().length;
      var remaining = this.todos.remaining().length;

      this.$('#todo-stats').html(this.statsTemplate({
        total:      this.todos.length,
        done:       done,
        remaining:  remaining
      }));

      this.delegateEvents();

      this.allCheckbox.checked = !remaining;
    },

    // 根据 filter的类型来过滤出相应的todos
    selectFilter: function(e) {
      var el = $(e.target);
      var filterValue = el.attr("id");
      state.set({filter: filterValue});
      AV.history.navigate(filterValue);
    },

    filter: function() {
      var filterValue = state.get("filter");
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#" + filterValue).addClass("selected");
      if (filterValue === "all") {
        this.addAll();
      } else if (filterValue === "completed") {
        this.addSome(function(item) { return item.get('done') });
      } else {
        this.addSome(function(item) { return !item.get('done') });
      }
    },

    // 清空 filter的效果，并且显示 所有的todo项
    resetFilters: function() {
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#all").addClass("selected");
      this.addAll();
    },

    // 加载一个 todo项到列表中，把它加到 todo-list ul 元素里面
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // 加载 collection中的的 todos 项
    addAll: function(collection, filter) {
      this.$("#todo-list").html("");
      this.todos.each(this.addOne);
    },

    // 加载部分的todo项，根据 filter
    addSome: function(filter) {
      var self = this;
      this.$("#todo-list").html("");
      this.todos.chain().filter(filter).each(function(item) { self.addOne(item) });
    },


    // 如果在 输入框 敲入回车键 ， 创建新的 Todo项
    createOnEnter: function(e) {
      var self = this;
      if (e.keyCode != 13) return;

      this.todos.create({
        content: this.input.val(),
        order:   this.todos.nextOrder(),
        done:    false,
        user:    AV.User.current(),
        ACL:     new AV.ACL(AV.User.current())
      });

      this.input.val('');
      this.resetFilters();
    },

    // 清空所有完成的todo
    clearCompleted: function() {
      _.each(this.todos.done(), function(todo){ todo.destroy(); });
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      this.todos.each(function (todo) { todo.save({'done': done}); });
    }
  });

  var LogInView = AV.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();

      // 登录
      AV.User.logIn(username, password, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          self.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var password = this.$("#signup-password").val();

      // 注册
      AV.User.signUp(username, password, { ACL: new AV.ACL() }, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(error.message).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
    }
  });

  // 程序的主体视图，控制 管理todos的视图和 登录试图
  var AppView = AV.View.extend({

    //  跟已经在html里的节点绑定起来，而不是再生成一个元素节点
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (AV.User.current()) {
        new ManageTodosView();
      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = AV.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  AV.history.start();
});
