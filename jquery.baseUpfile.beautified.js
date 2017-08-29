/*
time	20170824
author	rzl
mail	1120082028@qq.com
https://github.com/rzl/jquery.baseUpfile.js

 * @option_param {string} accept 输入框文件类型过滤/默认为打开所有类型文件
 * @option_param {string} key windows.localstorage的关键字。默认值为_baseUpfile_
 * @option_param {int} queueSize 队列长度，每次上传的个数，默认为2，同时上传2个文件
 * @option_param {string} preSize 每次发送的文件块大小，以K为单位
 * @option_param {string} uploadURL 接收文件块的路径，默认为uploadFile
 * @option_param {boolean} drop 拖拽开关，默认true，开启
 * @option_param {string} dropId 接收拖拽文件的元素ID，默认 #baseUpfileDrop
 * @option_param {string} inputButton 上传文件按钮的元素ID，默认 #baseUpfileInput
 * @option_param {function} onBeforeAddFile 文件载入时触发，将file state属性设置为faile则不会添加到文件列表，不会触发addFile
 * @option_param {function} onLoadFile 选择文件后触发，这里的files是所有添加过的文件
 * @option_param {function} onAddFile 选择文件后触发，如果选择多个文件则会触发多次
 * @option_param {function} onUploading 上传中,主要动态刷新上传进度
 * @option_param {function} onUploadError 上传异常 	'0': 文件未初始化 '1': 文件被禁用或删除 '2':文件大小异常 '3': 文件上传异常 '4': 服务器返回异常,回调
 * @option_param {function} onUploadDone 文件上传完成时触发
 * @option_param {function} onUploadAllDone 全部文件上传完成时触发
 * @option_param {function} onUploadStop 文件上传暂停时触发
 * @option_param {function} onLastBlockIndex 上传最后一个文件时附带数据,例如目录名字
 * @option_param {function} onFileStateChange 状态变更时触发faile,disable,error,stop,wait,uploading,done
		
常用属性
files 载入的所有文件列表

常用函数
setAccept 设置打开文件选择框的文件后缀
iniFile 初始化文件信息
disableFile 设置文件不可用，重新载入文件可激活
findFile 查找文件 本地根据文件名字及最后修改时候判断文件唯一性
stopUploadFile 停止上传文件
stopUploadFileByIndex 根据ID停止上传文件
startUploadFile 上传文件，上传文件时需要初始化
startUploadFileByIndex 根据ID上传文件
queueNext 下一个任务，状态变更时会检查一次队列，有等待任务则执行
resetFile 重置文件的上传信息
resetFileByIndex 重置文件的上传信息
resetAllFile 重置所有的文件的上传信息
setFileState 设置文件状态 //faile,disable,error,stop,wait,uploading,done
startAll 启动所有文件为上传状态
stopAll  停止所有文件上传
state 返回当前文件队列的任务状态统计
 */
(function(root, factory) {
    "use strict";
    if (typeof define === "function" && define.amd) {
        define([ "jquery" ], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(require("jquery"));
    } else {
        root.BaseUpfile = factory(root.jQuery);
    }
})(this, function($) {
    "use strict";
    var defaultOption = {
        accept: "*/*",
        key: "_baseUpfile_",
        queueSize: 2,
        preSize: "500",
        uploadURL: "uploadFile",
        drop: false,
        dropId: "#baseUpfileDrop",
        inputButton: "#baseUpfileInput",
        onBeforeAddFile: function(file) {},
        onLoadFile: function(files) {},
        onAddFile: function(file) {},
        onSameFile: function(file) {},
        onUploading: function(file, formData) {},
        onUploadError: function(file, code, result) {},
        onUploadDone: function(file) {},
        onUploadAllDone: function(state) {},
        onUploadStop: function(file) {},
        onLastBlockIndex: function(file, formData) {},
        onFileStateChange: function(file, state) {}
    };
    /*
		类的共享空间
		 */
    var shareData = {};
    /**
		 * [BaseUpfile description]
		 * @param {[type]} option [description]
		 */
    function BaseUpfile(option) {
        var _this = this;
        this.opt = $.extend({}, defaultOption, option);
        this.opt.preSize = this.opt.preSize * 1024;
        this.files = [];
        this.shareData = shareData;
        var opt = _this.opt;
        /**
			 * [loadFile 文件加载时的处理过程]
			 * @param  {[type]} files [选择或者拖放的文件列表]
			 */
        function loadFile(files) {
            if (!files.length) return;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                _this.initFile(file);
                opt.onBeforeAddFile(file);
                var fileIndex = _this.findFile(file);
                if (fileIndex < 0) {
                    file.fileIndex = _this.files.length;
                    if (file.state != "faile") {
                        _this.files.push(file);
                        opt.onAddFile(file);
                    }
                } else {
                    if (_this.files[fileIndex].state == "disable") {
                        _this.enableFile(_this.files[fileIndex]);
                        opt.onAddFile(_this.files[fileIndex]);
                    }
                    opt.onSameFile(_this.files[fileIndex]);
                }
            }
            opt.onLoadFile(_this.files);
        }
        if (opt.drop) {
            function ignoreDrag(e) {
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
            }
            $(opt.dropId).bind("dragenter", ignoreDrag).bind("dragover", ignoreDrag).bind("drop", function(e) {
                ignoreDrag(e);
                loadFile(e.originalEvent.dataTransfer.files);
            });
        }
        if ($(opt.inputButton).length) {
            $(opt.inputButton).attr("accept", opt.accept);
            $(opt.inputButton).on("change", function() {
                loadFile(this.files);
                $(opt.inputButton).val("");
            });
        }
        /**
			 * [setAccept 设置过滤后缀]
			 * @param {[type]} accept [更input file 的后缀一致]
			 */
        BaseUpfile.prototype.setAccept = function(accept) {
            $(this.opt.inputButton).attr("accept", accept);
        };
        /**
			 * [initFile 文件初始化]
			 * @param  {[type]} file [通过拖放转换的文件对象，或是input载入的文件对象]
			 * @return {[type]}      [this]
			 */
        BaseUpfile.prototype.initFile = function(file) {
            if (file.constructor.name != "File") {
                alert("not a file obj");
            }
            file.fileType = file.fileType ? file.fileType : file.type;
            file.state = "stop";
            file.lock = false;
            file.sendIndex = _this.getFileSendIndexCache(file);
            file.blockCount = Math.ceil(file.size / this.opt.preSize);
            if (file.size == 0) {
                opt.onUploadError(file, "2");
                file.state = "faile";
            }
            return this;
        };
        /**
			 * [disableFile 我这里没有删除文件的概念，设置状态为disable，将忽略文件]
			 * @param  {[type]} file [通过拖放转换的文件对象，或是input载入的文件对象]
			 */
        BaseUpfile.prototype.disableFile = function(file) {
            this.setFileState(file, "disable");
        };
        BaseUpfile.prototype.disableFileByIndex = function(index) {
            this.disableFile(this.files[index]);
        };
        BaseUpfile.prototype.enableFile = function(file) {
            this.setFileState(file, "stop");
        };
        /**
			 * [findFile 查找文件，返回索引，配合对象的files属性获取对应的文件属性]
			 * @param  {[type]} file [通过拖放转换的文件对象，或是input载入的文件对象]
			 * @return {[type]}      [BaseUpfile中files数组下标]
			 */
        BaseUpfile.prototype.findFile = function(file) {
            var files = this.files;
            for (var i = 0; i < files.length; i++) {
                if (typeof files[i] == "object" && files[i].name === file.name && files[i].lastModified === file.lastModified) {
                    return i;
                }
            }
            return -1;
        };
        /**
			 * [uploadFile 上传函数，一般不直接使用]
			 * @param  {[type]} file [经过init初始化的file]
			 */
        BaseUpfile.prototype.uploadFile = function(file) {
            if (file.lock) {
                return;
            }
            file.lock = true;
            var _this = this;
            var opt = _this.opt;
            if (!file.state || file.sendIndex == undefined || !file.blockCount) {
                console.log("文件未被初始化，不能上传");
                file.lock = false;
                opt.onUploadError(file, "0");
            }
            if (file.size == 0) {
                file.lock = false;
                opt.onUploadError(file, "2");
                return;
            }
            switch (file.state) {
              case "disable":
                file.lock = false;
                opt.onUploadError(file, "1");
                return;
                break;

              case "faile":
                file.lock = false;
                opt.onUploadError(file, "1");
                return;
                break;
            }
            file.sendIndex = parseInt(this.getFileSendIndexCache(file));
            if (file.blockCount <= file.sendIndex) {
                opt.onUploading(file);
                this.setFileState(file, "done");
                opt.onUploadDone(file);
                file.lock = false;
                var state = this.state();
                if (state.doneCount == state.enableCount) {
                    opt.onUploadAllDone(state);
                }
                return;
            }
            var formData = new FormData();
            var blockFile;
            if (file.size - file.sendIndex * opt.preSize > opt.preSize) {
                blockFile = file.slice(file.sendIndex * opt.preSize, (parseInt(file.sendIndex) + 1) * opt.preSize);
            } else {
                blockFile = file.slice(file.sendIndex * opt.preSize, file.size);
                formData.append("blockCount", file.blockCount);
                formData.append("fileSize", file.size);
                opt.onLastBlockIndex(file, formData);
            }
            formData.append("file", blockFile);
            formData.append("blockIndex", file.sendIndex);
            formData.append("fileName", file.name);
            opt.onUploading(file, formData);
            $.ajax({
                type: "post",
                url: _this.opt.uploadURL,
                data: formData,
                dataType: "json",
                contentType: false,
                processData: false,
                success: function(result) {
                    if (result.state || result.state == "true") {
                        file.sendIndex = parseInt(file.sendIndex) + 1;
                        _this.setFileSendIndexCache(file);
                    } else {
                        console.log("error");
                        _this.setFileState(file, "stop");
                        _this.opt.onUploadError(file, "4", result);
                    }
                    file.lock = false;
                    if (file.state == "stop") {
                        _this.opt.onUploadStop(file);
                        return;
                    }
                    _this.uploadFile(file);
                },
                error: function(e) {
                    file.lock = false;
                    _this.setFileState(file, "stop");
                    _this.opt.onUploadError(file, "3", e);
                }
            });
        };
        /**
			 * [uploadFileByIndex 根据数组下标上传]
			 * @param  {[type]} index [files的下标]
			 */
        BaseUpfile.prototype.uploadFileByIndex = function(index) {
            this.uploadFile(this.files[index], frist);
        };
        /**
			 * [stopUploadFile 暂停文件上传]
			 * @param  {[type]} file [description]
			 */
        BaseUpfile.prototype.stopUploadFile = function(file) {
            this.setFileState(file, "stop");
        };
        /**
			 * [stopUploadFileByIndex 根据FILES数组下标暂停文件上传]
			 * @param  {[type]} index [description]
			 */
        BaseUpfile.prototype.stopUploadFileByIndex = function(index) {
            this.setFileState(this.files[index], "stop");
        };
        /**
			 * [startUploadFile 开始上传文件]
			 * @param  {[type]} file [description]
			 */
        BaseUpfile.prototype.startUploadFile = function(file) {
            //var state=this.state();
            if (this.state().uploadingCount < this.opt.queueSize) {
                if (file.state == "uploading") return;
                this.setFileState(file, "uploading");
                this.uploadFile(file);
            } else {
                this.setFileState(file, "wait");
            }
        };
        /**
			 * [startUploadFileByIndex 根据FILES数组下标上传]
			 * @param  {[type]} index [description]
			 * @return {[type]}       [description]
			 */
        BaseUpfile.prototype.startUploadFileByIndex = function(index) {
            this.startUploadFile(this.files[index]);
        };
        /**
			 * [queueNext 队列检测函数]
			 */
        BaseUpfile.prototype.queueNext = function() {
            if (this.state().uploadingCount < this.opt.queueSize) {
                for (var a = 0; a < this.files.length; a++) {
                    if (this.files[a].state == "wait") {
                        var file = this.files[a];
                        break;
                    }
                }
                if (file != undefined) {
                    this.startUploadFile(file);
                }
            }
        };
        /**
			 * [getFileSendIndexCache description]
			 * @param  {[type]} file [description]
			 * @return {[type]}      [description]
			 */
        BaseUpfile.prototype.getFileSendIndexCache = function(file) {
            var sendIndex = window.localStorage.getItem(this.opt.key + file.name + file.lastModified);
            sendIndex = sendIndex ? sendIndex : 0;
            return sendIndex;
        };
        BaseUpfile.prototype.setFileSendIndexCache = function(file) {
            var sendIndex = file.sendIndex == undefined ? 0 : file.sendIndex;
            window.localStorage.setItem(this.opt.key + file.name + file.lastModified, sendIndex);
        };
        BaseUpfile.prototype.resetFileSendIndexCache = function(file) {
            window.localStorage.setItem(this.opt.key + file.name + file.lastModified, 0);
        };
        BaseUpfile.prototype.clearAllFileSendIndexCache = function() {
            for (var x in window.localStorage) {
                if (x.indexOf(this.opt.key) >= 0) {
                    delete window.localStorage[x];
                }
            }
            return this;
        };
        /**
			 * [resetFile 重置一个文件上传属性]
			 * @param  {[type]} file [description]
			 * @return {[type]}      [description]
			 */
        BaseUpfile.prototype.resetFile = function(file) {
            this.resetFileSendIndexCache(file);
            this.initFile(file);
        };
        BaseUpfile.prototype.resetFileByIndex = function(index) {
            this.resetFileSendIndexCache(this.files[index]);
            this.initFile(this.files[index]);
        };
        /**
			 * [resetAllFile 重置所有文件的上传属性]
			 * @return {[type]} [description]
			 */
        BaseUpfile.prototype.resetAllFile = function() {
            for (var a = 0; a < this.files.length; a++) {
                if (file.state !== "faile" && file.state != "disable") {
                    this.resetFile(this.files[a]);
                }
            }
        };
        BaseUpfile.prototype.getPrecent = function(file) {
            return Math.round(file.sendIndex / file.blockCount * 100);
        };
        /**
			 * [setFileState 设置文件状态]
			 * @param {[type]} file  [description]
			 * @param {[type]} state [faile,disable,error,stop,wait,uploading,done]
			 */
        BaseUpfile.prototype.setFileState = function(file, state) {
            file.state = state;
            this.queueNext();
            this.opt.onFileStateChange(file, state);
        };
        /**
			 * [startAll 激活全部文件上传]
			 * @return {[type]} [激活全部状态为stop、wait的队列任务]
			 */
        BaseUpfile.prototype.startAll = function() {
            for (var a = 0; a < this.files.length; a++) {
                var file = this.files[a];
                if (file.state == "stop" || file.state == "wait") {
                    this.startUploadFile(file);
                }
            }
        };
        /**
			 * [stopAll 暂时全部文件上传]
			 */
        BaseUpfile.prototype.stopAll = function() {
            for (var a = 0; a < this.files.length; a++) {
                var file = this.files[a];
                if (file.state == "uploading" || file.state == "wait") {
                    this.setFileState(file, "stop");
                }
            }
        };
        /**
			 * [state 返回文件列表状态统计]
			 * @return {[type]} [description]
			 */
        BaseUpfile.prototype.state = function() {
            var total = this.files.length;
            var disableCount = 0;
            var errorCount = 0;
            var doneCount = 0;
            var stopCount = 0;
            var waitCount = 0;
            var uploadingCount = 0;
            for (var a = 0; a < this.files.length; a++) {
                var file = this.files[a];
                switch (file.state) {
                  case "disable":
                    disableCount++;
                    break;

                  case "error":
                    errorCount++;
                    break;

                  case "stop":
                    stopCount++;
                    break;

                  case "wait":
                    waitCount++;
                    break;

                  case "uploading":
                    uploadingCount++;
                    break;

                  case "done":
                    doneCount++;
                    break;
                }
            }
            return {
                total: total,
                enableCount: total - disableCount,
                disableCount: disableCount,
                stopCount: stopCount,
                waitCount: waitCount,
                uploadingCount: uploadingCount,
                doneCount: doneCount
            };
        };
    }
    return BaseUpfile;
});