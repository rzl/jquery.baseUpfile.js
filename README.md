# jquery.baseUpfile.js
html5 javascript resume file upload ， HTML5文件断点上传,支持拖放
![image](https://github.com/rzl/jquery.baseUpfile.js/blob/master/201708241503570847599eab9fee0b7.gif)
```html
<head>
<meta http-equiv="content-type" content="text/html; charset=UTF-8"> 
</head>
<script src="jquery.min.js"></script>
<script src="jquery.baseUpfile.js"></script>
<table id="fileList" style="width:100%;height:30%">
<tr>
<td>文件名</td>
<td>文件类型</td>
<td>文件大小</td>
<td>上传进度</td>
<td><button onclick="$('.uploadButton').click();">全部上传</button></td>
<td><button onclick="$('.stopButton').click();">全部暂停</button></td>
<td><button onclick="$('.continueButton').click();">全部续传</button></td>
		
</tr>
</table>
<input type="file" id="baseUpfileInput" multiple style="display:none">
<button id="open" onclick="$(baseUpfileInput).click()" >打开</button>
<button id="clearCache" >清除缓存</button>
<button id="setAccept" >设置文件过滤</button>
<div id="state"></div>
```
```javascript
<script>
	var creatFileView=function(file){
		str='<tr>';
		str+='<td>'+file.name+'</td>';
		str+='<td>'+file.fileType+'</td>';
		str+='<td>'+Math.ceil(file.size/1024)+'k</td>';
		str+='<td id="p_'+file.fileIndex+'" >'+Math.round(file.sendIndex/file.blockCount*100)+'%</td>';
		str+='<td><button class="uploadButton" onclick="up.startUploadFileByIndex('+file.fileIndex+','+true+')">上传</button></td>';
		str+='<td><button class="stopButton" onclick="up.stopUploadFileByIndex('+file.fileIndex+')">暂停</button></td>';
		str+='<td><button class="continueButton" onclick="up.startUploadFileByIndex('+file.fileIndex+')">续存</button></td>';
		str+='<td><button class="deleteButton" onclick="up.disableFileByIndex('+file.fileIndex+');$(this).parent().parent().remove();">删除</button></td>';
		str+='<td><button class="reSend" onclick="up.resetFileByIndex('+file.fileIndex+');up.startUploadFileByIndex('+file.fileIndex+')">重新上传</button></td>';
		str+='</tr>';
		$('#fileList').append(str);
	}
	var updatePrecent=function(file){
		$("#p_"+file.fileIndex).text(Math.ceil(file.sendIndex/file.blockCount*100)+'%');
	}
	var uploadDone=function(file){
		$("#p_"+file.fileIndex).text('完成');
		var state=up.state();
		$("#state").text('总文件:'+state.total+' 有效文件:'+state.enableCount+' 无效文件:'+state.disableCount+' 完成:'+state.doneCount+' 当前上传任务数:'+state.uploadingCount+' 停止任务数:'+state.stopCount+' 队列任务数:'+state.waitCount);
	}
	var uploadAllDone=function(){
		$("#state").text($("#state").text()+'全部上传完成');
	}
	var fileStateChange=function(file,state){
		$("#p_"+file.fileIndex).text(state);

	}
	var beforeAddFile=function(file){
		if (file.name.toLowerCase().indexOf('.flv')>0){
			file.fileType="video/flv";
		}
		if (file.name.toLowerCase().indexOf('44')>-1){
			file.state='faile';
		}
	}
	var sameFile=function(file){
		console.log('sameFile'+file.name)
	}
	var loadFile=function(files){
		console.log('filesCount'+files.length);
	}
	var uploadError=function(file,code,result){
		console.log('error:'+file.name+'errorCode'+code);
	}
	var lastBlobIndex=function(file,formData){
		formData.append('fileType',file.fileType);
	}
	var up=new BaseUpfile({
		accept: "*/*", //输入框后缀
		key: '_rzl_', //windows.localstorage的关键字
		queueSize: 2,//同时上传的文件数
		preSize: '500', //每次发送的文件块大小，以K为单位，设定后不要修改，否则上传文件将出现异常
		uploadURL: 'uploadFile.php', //上传的路径
		inputButton: '#baseUpfileInput', //上传按钮ID
		drop:true,
		dropId:'#fileList',
		onLoadFile: loadFile, //选择文件后触发，这里的files是所有添加过的文件
		onSameFile: sameFile, //选择文件后触发
		onUploadError: uploadError, //上传异常 //参照errorCode
		onLastBlobIndex: lastBlobIndex, //上传最后一个文件时附带数据,例如目录名字
		onAddFile:creatFileView,	//选择文件后触发，如果选择多个文件则会触发多次
		onBeforeAddFile:beforeAddFile,	//文件过滤,可以使用,如果将file的enable设置为false，则不会添加到文件列表，不会触发addFile
		onUploading:updatePrecent,	//上传中,主要动态刷新上传进度
		onUploadDone:uploadDone,	//文件上传完成
		onUploadAllDone:uploadAllDone, //全部有效文件文件上传完成
		onFileStateChange:fileStateChange	//状态变更时触发 faile,disable,error,stop,wait,uploading,done
	});
	
	
	$("#aa").click(function(){
		    var fileurl = window.URL.createObjectURL(up.files[0]);                
                var str="<img width='200px' height='200px' src='"+fileurl+"'>";  
                document.getElementById('baseUpfileDrop').innerHTML=str;   
			up.uploadFile(up.files[0]);
		
	});
	$("#setAccept").click(function(){
		up.setAccept('image/png,image/gif,image,jpgimage/jepg');
	});
	$("#clearCache").click(function(){
		up.clearAllFileSendIndexCache();
	});

</script>
```
