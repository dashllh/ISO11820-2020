/* 该组件封装客户端控制器温度图表控件(Echarts) */
class TempChart extends HTMLElement {
    /* 属性定义 */
    #chartId = 0;  //图表控件全局ID
    #chartObj = null; //chart实体对象

    //温度数据缓存
    #temp1Buf = [[0, 0]];
    #temp2Buf = [[0, 0]];
    #tempSufBuf = [[0, 0]];
    #tempCenBuf = [[0, 0]];

    //图表配置属性
    #option = {
        title: {
            show: false
        },
        grid: {
            left: 65,
            top: '10%',
            right: 40,
            bottom: '12%'
        },
        xAxis: {
            type: "value",
            max: 1800,
            splitLine: {
                show: true
            }
        },
        yAxis: {
            name: "实时温度(℃)",
            nameTextStyle: {
                width: 25,
                fontSize: 14,
                padding: 20
            },
            type: "value",
            boundaryGap: [0, "30%"],
            nameLocation: "middle",
            splitLine: {
                show: true                
            }
        }
    };

    /*
        功能: 构造函数
        参数:
              id:number - 图表控件全局ID
    */
    constructor(id) {
        super();

        this.#chartId = id;
        this.render();
    }

    /* 回调函数 */
    connectedCallback() {
        if (this.#chartObj === null) {
            const chartDom = document.getElementById(`_idChart${this.#chartId}`);
            this.#chartObj = echarts.init(chartDom);
            // 输出调试消息
            console.log(`Echarts ${this.#chartId} initialized.`);
            this.#chartObj.setOption(this.#option);
            this.#chartObj.setOption({
                series: [
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#temp1Buf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#temp2Buf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#tempSufBuf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#tempCenBuf,
                        lineStyle: {
                            width: 1
                        }
                    }
                ]
            });
            //注册窗体大小改变回调函数,实现响应式效果
            // window.onresize = OnWindowResize(this.#chartObj);
        }
    }

    disconnectedCallback() {
        //释放chart实体对象内存资源
        // this.#chartObj.dispose();
        // this.#chartObj = null;
    }

    /* 接口方法 */

    /*
        功能: 刷新图表显示
        参数:
            timer - 试验计时
            temp1 - 炉内温度1
            temp2 - 炉内温度2
            tempSuf - 表面温度
            tempCen - 中心温度
    */
    refresh(timer,temp1,temp2,tempSuf,tempCen) {
        this.#temp1Buf.push([timer,temp1]);
        this.#temp2Buf.push([timer,temp2]);
        this.#tempSufBuf.push([timer,tempSuf]);
        this.#tempCenBuf.push([timer,tempCen]);
        this.#chartObj.setOption({
            series: [
                {
                    data: this.#temp1Buf
                },
                {
                    data: this.#temp2Buf
                },
                {
                    data: this.#tempSufBuf
                },
                {
                    data: this.#tempCenBuf
                }
            ]
        });
    }

    get template() {
        return `
            <div id="_idChart${this.#chartId}" style="width: 730px;height: 210px;"></div>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }

}

function OnWindowResize(chartObj) {
    chartObj.resize();
}

customElements.define('ctrl-chart', TempChart);

export { TempChart }