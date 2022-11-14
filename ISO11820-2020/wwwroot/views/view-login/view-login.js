/*
    功能: 该组件定义系统登录视图
*/

// 导入全局对象
import { SendClientCmd } from "../../App.js"

class LoginView extends HTMLElement {
    /* 属性定义 */
    #btnSubmit = null;
    #txtUserName = null;
    #txtPasswd = null;

    constructor() {
        super();

        this.render();
    }

    // 元素重载方法
    connectedCallback() {
        // 设置视图背景
        document.body.style.backgroundImage = "url('./assets/images/login.png')";
        // 初始化视图内部组件
        if (this.#btnSubmit === null) {
            this.#btnSubmit = document.getElementById('btnSubmit');
            this.#btnSubmit.addEventListener('click', (e) => {
                e.preventDefault();
                let param = {
                    username: this.#txtUserName.value,
                    password: this.#txtPasswd.value,
                };
                SendClientCmd('login', param);
            });
        }

        if (this.#txtUserName === null) {
            this.#txtUserName = document.getElementById('txtUserName');
        }

        if (this.#txtPasswd === null) {
            this.#txtPasswd = document.getElementById('txtPasswd');
        }
    }

    disconnectedCallback() {

    }

    get template() {
        return `
                <form class="login-form">
                    <h2>系统登录</h2>
                    <input id="txtUserName" type="text" value="" placeholder="用户名" name="name">
                    <input id="txtPasswd" type="password" value="" placeholder="密码" name="value">
                    <input id="btnSubmit" type="submit" value="登录">
                </form>
                `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('view-login', LoginView);

export { LoginView }