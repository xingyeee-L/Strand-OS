export type UiLang = 'zh' | 'en';

const STORAGE_KEY = 'strand:ui_lang';

export const getInitialUiLang = (): UiLang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    // ignore
  }

  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
};

export const persistUiLang = (lang: UiLang) => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
};

type Dict = Record<string, { zh: string; en: string }>;

const DICT: Dict = {
  'common.zh': { zh: '中文', en: '中文' },
  'common.en': { zh: 'EN', en: 'EN' },

  'hud.systemOnline': { zh: '系统在线', en: 'SYSTEM ONLINE' },
  'hud.level': { zh: '等级', en: 'LV' },

  'start.bootSequence': { zh: '启动序列', en: 'BOOT SEQUENCE' },
  'start.initialization': { zh: '初始化', en: 'INITIALIZATION' },
  'start.enter': { zh: '进入 STRAND', en: 'ENTER THE STRAND' },
  'start.tip': { zh: '进入主程序后，可在命令台切换 聊天/搜索 模式。', en: 'In the console, switch CHAT/SEARCH modes.' },
  'start.systemLog': { zh: '系统日志', en: 'SYSTEM LOG' },
  'start.controls': { zh: '控制台', en: 'CONTROLS' },
  'start.recommendPurge': { zh: '建议先清理缓存，避免历史版本遗留数据导致异常。', en: 'Recommended: purge cache to avoid legacy dirty data.' },
  'start.boot': { zh: '启动', en: 'BOOT' },
  'start.purgeCache': { zh: '清理缓存', en: 'PURGE CACHE' },
  'start.purging': { zh: '清理中...', en: 'PURGING...' },
  'start.safeMode': { zh: '安全模式 · 不影响服务器数据', en: 'SAFE MODE · NO DATA LOSS ON SERVER' },

  'dialogue.chat': { zh: '聊天', en: 'CHAT' },
  'dialogue.search': { zh: '搜索', en: 'SEARCH' },
  'dialogue.placeholderChat': { zh: '输入对话…', en: 'ENTER CHAT...' },
  'dialogue.placeholderSearch': { zh: '输入单词…', en: 'SEARCH WORD...' },
  'dialogue.hintChat': { zh: '回车=发送 · /jump=跳转 · /scan=扫描', en: 'ENTER=SEND · /jump=JUMP · /scan=SCAN' },
  'dialogue.hintSearch': { zh: '回车=跳转 · TAB=接受 · ESC=关闭', en: 'ENTER=JUMP · TAB=ACCEPT · ESC=CLOSE' },
  'dialogue.logTitle': { zh: 'SC-7274 战术日志', en: 'SC-7274 TACTICAL LOG' },
  'dialogue.linking': { zh: '正在刻录神经指纹...', en: 'ENGRAVING NEURAL FINGERPRINT...' },
  'dialogue.decrypting': { zh: '解密信号流...', en: 'DECRYPTING SIGNAL STREAM...' },
  'dialogue.networkTitle': { zh: '本地网络', en: 'LOCAL_NET' },
  'dialogue.objects': { zh: '对象', en: 'OBJ' },
  'dialogue.syncing': { zh: '刻录中...', en: 'SYNCING...' },
  'dialogue.syncLink': { zh: '同步', en: 'SYNC_LINK' },
  'dialogue.stable': { zh: '稳定', en: 'STABLE' },
  'dialogue.scan': { zh: '扫描', en: 'SCAN' },
  'dialogue.observe': { zh: '观测', en: 'OBSERVE' },
  'dialogue.syncRequired': { zh: '[!] 需要同步', en: '[!] SYNC_REQUIRED' },

  'mission.openData': { zh: '数据', en: 'OPEN_DATA' },
  'mission.missions': { zh: '任务', en: 'MISSIONS' },
  'mission.dailyOrders': { zh: '今日指令', en: 'DAILY ORDERS' },
  'mission.pendingCount': { zh: '待处理', en: 'PENDING' },
  'mission.switchVocabulary': { zh: '切换词库', en: 'Switch Vocabulary Data' },
  'mission.noStreams': { zh: '无数据流', en: 'NO DATA STREAMS' },
  'mission.reinforce': { zh: '复习', en: 'REINFORCE' },
  'mission.explore': { zh: '探索', en: 'EXPLORE' },
  'mission.abort': { zh: '[ 终止 ]', en: '[ ABORT ]' },
  'mission.ok': { zh: '完成', en: 'OK' },
  'mission.requestSlot': { zh: '请求额外任务', en: 'REQUEST_DATA_SLOT' },

  'target.noTarget': { zh: '无目标', en: 'NO TARGET' },
  'target.scanning': { zh: '扫描中...', en: 'SCANNING...' },
  'target.standby': { zh: '系统待命', en: 'SYSTEM STANDBY' },
  'target.secure': { zh: '安全', en: 'SECURE' },
  'target.addNoteTitle': { zh: '添加单词笔记', en: 'Add word note' },
  'target.addNote': { zh: '添加笔记', en: 'ADD NOTE' },
  'target.uploadTitle': { zh: '上传全局记忆 (RAG)', en: 'Upload global memory (RAG)' },
  'target.uploading': { zh: '上传中...', en: 'UPLOADING...' },
  'target.ingestData': { zh: '注入数据', en: 'INGEST DATA' },

  'book.activeProtocol': { zh: '当前协议', en: 'Active Protocol' },
  'book.noData': { zh: '无数据', en: 'NO DATA' },
  'book.online': { zh: '在线', en: 'ONLINE' },
  'book.progressIndex': { zh: '进度索引', en: 'PROGRESS INDEX' },
  'book.wordsIngested': { zh: '已注入单词', en: 'Words Ingested' },
  'book.availableDatabases': { zh: '可用词库', en: 'AVAILABLE DATABASES' },
  'book.entries': { zh: '条目', en: 'ENTRIES' },

  'note.inscribe': { zh: '写入记忆碎片', en: 'INSCRIBE_MEMORY_FRAGMENT' },
  'note.placeholder': { zh: '在此注入战术笔记...', en: 'Type your note here...' },
  'note.sync': { zh: '同步', en: 'SYNCHRONIZE' },
  'note.integrity': { zh: '数据完整性由手性网络保障', en: 'DATA INTEGRITY GUARANTEED BY CHIRAL NETWORK' },
};

export const t = (lang: UiLang, key: string) => {
  const item = DICT[key];
  if (!item) return key;
  return lang === 'zh' ? item.zh : item.en;
};
