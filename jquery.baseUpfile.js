/*
time	20170824
author	rzl
mail	1120082028@qq.com

 */
(function (root, factory) {
	"use strict";

	if (typeof define === "function" && define.amd) {
		define(["jquery"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("jquery"));
	} else {
		root.BaseUpfile = factory(root.jQuery);
	}

}
	(this, function ($) {
		"use strict";
		var defaultOption = {
			accept: "*/*", //输入框后缀
			key: '_rzl_', //windows.localstorage的关键字
			queueSize: 2,
			preSize: '500', //每次发送的大小，以K为单位
			uploadURL: 'uploadFile.php', //上传的路径
			drop: false, //开启拖拽
			dropId: '#baseUpfileDrop', //拖拽区域ID
			inputButton: '#baseUpfileInput', //上传按钮ID
			onBeforeAddFile: function (file) {}, //文件过滤,可以使用,如果将file的enable设置为false，则不会添加到文件列表，不会触发addFile
			onLoadFile: function (files) {}, //选择文件后触发，这里的files是所有添加过的文件
			onAddFile: function (file) {}, //选择文件后触发，如果选择多个文件则会触发多次
			onSameFile: function (file) {}, //选择文件后触发
			onUploading: function (file, formData) {}, //上传中,主要动态刷新上传进度
			onUploadError: function (file, code, result) {}, //上传异常 //参照errorCode
			onUploadDone: function (file) {}, //文件上传完成
			onUploadAllDone: function (state) {}, //文件上传完成
			onUploadStop: function (file) {}, //停止上传
			onLastBlockIndex: function (file, formData) {}, //上传最后一个文件时附带数据,例如目录名字
			onFileStateChange: function (file, state) {}	//状态变更时触发
			//faile,disable,error,stop,wait,uploading,done
		};
		/*
		var errorCode = {
		'0': 'file dose not init', //文件未初始化
		'1': 'file state disbale', //文件被禁用
		'2': 'file size error', //文件大小异常
		'3': 'file upload error', //文件上传异常
		'4': 'server error', //服务器返回异常,回调
		};
		 */
		/*
		类的共享空间
		 */
		var shareData = {};
		function BaseUpfile(option) {
			var _this = this;
			this.opt = $.extend({}, defaultOption, option);
			this.opt.preSize = this.opt.preSize * 1024;
			this.files = [];
			this.shareData = shareData;
			var opt = _this.opt;
			function loadFile(files) {
				if (!files.length)
					return;
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					_this.initFile(file);
					opt.onBeforeAddFile(file);
					var fileIndex = _this.findFile(file);
					if (fileIndex < 0) {
						file.fileIndex = _this.files.length;
						if (file.state != 'faile') {
							_this.files.push(file);
							opt.onAddFile(file);
						}
					} else {
						if (_this.files[fileIndex].state == 'disable') {
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
				$(opt.dropId).bind('dragenter', ignoreDrag)
				.bind('dragover', ignoreDrag)
				.bind('drop', function (e) {
					ignoreDrag(e);
					loadFile(e.originalEvent.dataTransfer.files);
				});
			}
			if ($(opt.inputButton).length) {
				$(opt.inputButton).attr('accept', opt.accept);
				$(opt.inputButton).on("change", function () {
					loadFile(this.files);
					$(opt.inputButton).val('');
				});
			};

			/*
			设置文件类型过滤
			 */
			BaseUpfile.prototype.setAccept = function (accept) {
				$(this.opt.inputButton).attr('accept', accept);
			};

			/*
			初始化文件信息
			 */
			BaseUpfile.prototype.initFile = function (file) {
				if (file.constructor.name != 'File') {
					alert('not a file obj');
				}
				file.fileType = file.fileType ? file.fileType : file.type;
				file.state = 'stop';
				file.sendIndex = _this.getFileSendIndexCache(file);
				file.blockCount = Math.ceil(file.size / this.opt.preSize);
				if (file.size == 0) {
					opt.onUploadError(file, '2');
					file.state = 'faile';
				}
				return this;
			};

			/*
			我这里没有删除文件的概念，设置状态为disable，将忽略文件
			 */
			BaseUpfile.prototype.disableFile = function (file) {
				this.setFileState(file, 'disable');
			};
			BaseUpfile.prototype.disableFileByIndex = function (index) {
				this.disableFile(this.files[index]);
			};
			BaseUpfile.prototype.enableFile = function (file) {
				this.setFileState(file, 'stop');
			};

			/*
			查找文件，返回索引，配合对象的files属性获取对应的文件属性
			 */
			BaseUpfile.prototype.findFile = function (file) {
				var files = this.files;
				for (var i = 0; i < files.length; i++) {
					if ((typeof(files[i]) == 'object') && (files[i].name === file.name) && (files[i].lastModified === file.lastModified)) {
						return i;
					}
				}
				return -1;
			};
			/*
			上传函数，一般不直接使用，需要经过初始化
			 */
			BaseUpfile.prototype.uploadFile = function (file) {
				var _this = this;
				var opt = _this.opt;
				if (!file.state || !file.sendIndex || !file.blockCount) {
					console.log('文件未被初始化，不能上传');
					_this.setFileState(file, 'error');
					opt.onUploadError(file, '0');
				}
				if (file.size == 0) {
					_this.setFileState(file, 'error');
					opt.onUploadError(file, '2');
					return;
				}
				switch (file.state) {
				case 'disable':
					opt.onUploadError(file, '1');
					return;
					break;
				case 'stop':
					return;
					break;
				}
				file.sendIndex = parseInt(this.getFileSendIndexCache(file));
				if (file.blockCount <= file.sendIndex) {
					opt.onUploading(file);
					this.setFileState(file, 'done');
					opt.onUploadDone(file);
					var state = this.state();
					if (state.doneCount == state.enableCount) {
						opt.onUploadAllDone(state);
					}
					return;
				}
				var formData = new FormData();
				var blockFile;
				if ((file.size - file.sendIndex * opt.preSize) > opt.preSize) {
					blockFile = file.slice(file.sendIndex * opt.preSize, (parseInt(file.sendIndex) + 1) * opt.preSize);
				} else {
					blockFile = file.slice(file.sendIndex * opt.preSize, file.size);
					formData.append('blockCount', file.blockCount);
					formData.append('fileSize', file.size);
					opt.onLastBlockIndex(file, formData);
				}
				formData.append('file', blockFile);
				formData.append('blockIndex', file.sendIndex);
				formData.append('fileName', file.name);
				opt.onUploading(file, formData);
				$.ajax({
					type: 'post',
					url: _this.opt.uploadURL,
					data: formData,
					dataType: 'json',
					contentType: false,
					processData: false,
					success: function (result) {
						if (result.state || result.state == "true") {
							file.sendIndex = parseInt(file.sendIndex) + 1;
							_this.setFileSendIndexCache(file);
						} else {
							_this.setFileState(file, 'error');
							_this.opt.onUploadError(file, '4', result);
						}
						if (file.state == 'stop') {
							_this.opt.onUploadStop(file);
							return;
						}
						_this.uploadFile(file);
					},
					error: function (e) {
						_this.setFileState(file, 'error');
						_this.opt.onUploadError(file, '3', e);
					}
				})
			};
			BaseUpfile.prototype.uploadFileByIndex = function (index, frist) {
				this.uploadFile(this.files[index], frist);
			};
			/*
			暂停上传
			 */
			BaseUpfile.prototype.stopUploadFile = function (file) {
				this.setFileState(file, 'stop');
			};
			BaseUpfile.prototype.stopUploadFileByIndex = function (index) {
				this.setFileState(this.files[index], 'stop');
			};
			/*
			开始上传，文件初始化后建议使用该函数上传
			 */
			BaseUpfile.prototype.startUploadFile = function (file) {
				//var state=this.state();
				if (this.state().uploadingCount < this.opt.queueSize) {
					if (file.state == 'uploading')
						return;
					this.setFileState(file, 'uploading')
					this.uploadFile(file);
				} else {
					this.setFileState(file, 'wait')
				}
			};
			BaseUpfile.prototype.startUploadFileByIndex = function (index) {
				this.startUploadFile(this.files[index]);
			};
			BaseUpfile.prototype.queueNext = function () {
				if (this.state().uploadingCount < this.opt.queueSize) {
					for (var a = 0; a < this.files.length; a++) {
						if (this.files[a].state == 'wait') {
							var file = this.files[a];
							break;
						}
					}
					if (file != undefined) {
						this.startUploadFile(file);
					}
				}

			}
			BaseUpfile.prototype.getFileSendIndexCache = function (file) {
				var sendIndex = window.localStorage.getItem(this.opt.key + file.name + file.lastModified);
				sendIndex = sendIndex ? sendIndex : 0;
				return sendIndex;
			};
			BaseUpfile.prototype.setFileSendIndexCache = function (file) {
				var sendIndex = file.sendIndex == undefined ? 0 : file.sendIndex;
				window.localStorage.setItem(this.opt.key + file.name + file.lastModified, sendIndex);
			};
			BaseUpfile.prototype.resetFileSendIndexCache = function (file) {
				window.localStorage.setItem(this.opt.key + file.name + file.lastModified, 0);
			};
			BaseUpfile.prototype.clearAllFileSendIndexCache = function () {
				for (var x in window.localStorage) {
					if (x.indexOf(this.opt.key) >= 0) {
						delete window.localStorage[x]
					}
				}
				return this;
			};
			BaseUpfile.prototype.resetFile = function (file) {
				this.resetFileSendIndexCache(file);
				this.initFile(file);
			};
			BaseUpfile.prototype.resetFileByIndex = function (index) {
				this.resetFileSendIndexCache(this.files[index]);
				this.initFile(this.files[index]);
			};
			BaseUpfile.prototype.resetFiles = function () {
				for (var a = 0; a < this.files.length; a++) {
					this.resetFile(this.files[a]);
				}
			};
			BaseUpfile.prototype.getPrecent = function (file) {
				return Math.round(file.sendIndex / file.blockCount * 100);
			};
			BaseUpfile.prototype.setFileState = function (file, state) {
				file.state = state;
				this.queueNext();
				this.opt.onFileStateChange(file, state);
			}
			BaseUpfile.prototype.state = function () {
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
					case 'disable':
						disableCount++;
						break;
					case 'error':
						errorCount++;
						break;
					case 'stop':
						stopCount++;
						break;
					case 'wait':
						waitCount++;
						break;
					case 'uploading':
						uploadingCount++;
						break;
					case 'done':
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
					doneCount: doneCount,
				};
			}
		}

		return BaseUpfile;

	}));
