var app = (function () {

    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    var stompClient = null;
    var idDrawing = null; 
    var canvas = document.querySelector('#canvas'); 
    var ctx = canvas.getContext("2d"); 
    var input = document.querySelector('#idDrawing');
    


    var loadListener = function () {
        // if (window.PointerEvent) {
        //     canvas.addEventListener("pointerdown", event => {
        //         const pt = getMousePosition(event);
        //         addPointToCanvas(pt);

        //         stompClient.send("/topic/newpoint", {}, JSON.stringify(pt));
        //     });
        // }

        if(input) input.addEventListener('change', updateId);
        const eventCanvas = (window.PointerEvent) ? 'pointerdown':'mousedown'; 
        canvas.addEventListener(eventCanvas, eventPoint);
    }


    var updateId = function(event){
        idDrawing = event.target.value; 
        console.log(`newValue ${idDrawing}`); 
    }

    var eventPoint = function(event){
        // const pt = getMousePosition(event); 
        // addPointToCanvas(pt); 
        // if(idDrawing) stompClient.send(`/app/newpoint.${idDrawing}`, {}, JSON.stringify(pt)); 

        const {x,y} = getMousePosition(event); 
        if(idDrawing) app.publishPoint(x,y); 
    }

    var addPointToCanvas = function (point) {
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.stroke();
    };


    var getMousePosition = function (evt) {
        canvas = document.getElementById("canvas");
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    };

    var drawPolygon = function(points){
        canvas.width = canvas.width;
        var { x: fstPosX, y: fstPosY } = points[0];
        ctx.moveTo(fstPosX, fstPosY);
        
        points.forEach(point => {
            const { x , y } = point;
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.lineTo(x,y);
        });
        ctx.lineTo(fstPosX, fstPosY);
        ctx.stroke();
    }


    var connectAndSubscribe = function () {
        console.info('Connecting to WS...');
        var socket = new SockJS('/stompendpoint');
        stompClient = Stomp.over(socket);


        canvas.width = canvas.width; 

        //subscribe to /topic/TOPICXX when connections succeed
        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            stompClient.subscribe(`/app/newpoint.${idDrawing}`, function (eventbody) {
                const pt = JSON.parse(eventbody.body);
                addPointToCanvas(pt); 
            });

            stompClient.subscribe(`/topic/newpolygon.${idDrawing}`, function (eventbody) {
                const points = JSON.parse(eventbody.body);
                drawPolygon(points);
            });
    
            stompClient.subscribe(`/topic/queue.${idDrawing}`, function (eventbody) {
                const points = JSON.parse(eventbody.body);
                if( points.length  < 3 ){
                    points.forEach(point => addPointToCanvas(point));
                    return;
                }
                drawPolygon(points);
            });

            stompClient.send(`/app/queue.${idDrawing}`, {});
        });

        

       

    };



    return {

        init: function () {
            // var can = document.getElementById("canvas");

            loadListener(); 
            //websocket connection
            // connectAndSubscribe();
        },

        publishPoint: function (px, py) {
            var pt = new Point(px, py);
            console.info("publishing point at " + pt);
            addPointToCanvas(pt);

            //publicar el evento
            // stompClient.send("/topic/newpoint", {}, JSON.stringify(pt));

            // stompClient.send(`/topic/newpoint.${idDrawing}`, {}, JSON.stringify(pt)); 
            stompClient.send(`/app/newpoint.${idDrawing}`, {}, JSON.stringify(pt));
        },

        disconnect: function () {
            if (stompClient !== null) {
                stompClient.disconnect();
            }
            setConnected(false);
            console.log("Disconnected");
        },

        publishDrawing(currentId){
            idDrawing = currentId; 
            connectAndSubscribe();
        }

    };

})();