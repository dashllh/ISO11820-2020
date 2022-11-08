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
    }

    connectedCallback() {
        if (this.#objMsgTable === null) {
            this.#objMsgTable = document.getElementById(`_idMsgTable${this.#msgTableId}`);
        }
    }

    /*
        功能: 在列表第一行插入一条数据
        参数:
              time:string    - 时间
              content:string - 消息内容
    */
    appendNewMsg(time, content) {
        let newRow = this.#objMsgTable.insertRow(0);
        let Cell1 = newRow.insertCell(0); //消息时间
        let Cell2 = newRow.insertCell(1); //消息内容
        Cell1.textContent = time;
        Cell2.textContent = content;
    }

    //清空列表显示(排除首行标题栏)
    clear() {
        var i;
        var totallen = this.#objMsgTable.rows.length;
        for (i = totallen - 1; i >= 0; i--) {
            this.#objMsgTable.deleteRow(i);
        }
    }

    get template() {
        return `
                <table>
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>消息内容</th>
                        </tr>
                    </thead>
                    <tbody id="_idMsgTable${this.#msgTableId}">
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