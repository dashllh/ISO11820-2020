/* 该组件实现控制器消息列表显示 */
class MasterMsg extends HTMLElement {
    /* 属性定义 */
    #msgTableId;  //该消息显示控件全局ID
    #objMsgTable = null; //消息显示控件对象引用

    constructor(id) {
        super();

        this.#msgTableId = id;

        this.render();

        //测试代码:动态创建控件ID属性
        var attrId = document.createAttribute("id");
        attrId.value = `_idTableMasterMsg${this.#msgTableId}`;
        this.setAttributeNode(attrId);
    }

    attributeChangedCallback() {
        this.render();
    }

    connectedCallback() {
        if (this.#objMsgTable === null) {
            this.#objMsgTable = document.getElementById(`_idMsgTable${this.#msgTableId}`);
        }

    }

    /*
        功能: 在列表第一行插入一条数据
        参数:
              data:JSON - 消息数据 
    */
    appendNewMsg(msg) {

    }

    //清空列表显示
    clear() {

    }

    get template() {
        return `
                <table id="_idMsgTable${this.#msgTableId}">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>消息内容</th>
                        </tr>
                    </thead>
                    <tbody> 
                        <tr>
                            <td>16:52:33</td>
                            <td>开始计时</td>
                        </tr>
                    </tbody>
                </table>
                `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('table-mastermsg', MasterMsg);

export { MasterMsg }