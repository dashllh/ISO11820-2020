let dmLogin = {
    username: '',
    password: ''
}

// 实现数据模型到界面的绑定
let dmhandler_login = {
    set: function (target, property, value) {
        if (property in target) {
            target[property] = value;
            // 同步更新界面绑定该值的元素
            const item = document.querySelector(`[data-binding=${property}]`);
            if (item !== null) {
                item.value = value;
            }
            return true;
        }
        // target没有对应的属性,返回false
        return false;
    }
}
let dmProxy_login = new Proxy(dmLogin, dmhandler_login);

// 实现界面到数据模型的绑定
const items_view_login = document.querySelectorAll("[data-binding]");
items_view_login.forEach((item) => {
    // 获取当前input元素绑定的ViewModel属性
    const propName = item.dataset.binding;
    // 实时更新数据模型的值
    item.addEventListener('input', (event) => {
        dmLogin[propName] = item.value;
    });
});

document.getElementById('btnSubmit').addEventListener('click', (event) => {
    event.preventDefault();
    // 提交登录数据
    let option = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dmLogin)
    }
    window.fetch("api/TestMaster/login", option)
        .then(response => response.json())
        .then(data => {
            if (data.ret === '0') {  //登录成功                
                // 跳转至试验系统主界面
                window.location.href = "main.html";
            }
        });
});