import utopiaProfile from '../../public/utopia_profile.json';

const config = {
  appName: "未来大生専用マッチングアプリ",
  appDescription: "未来大生による、未来大生のためのマッチングアプリ",
  prompt: "fun-matching",
  baseUrl: "https://fun-matching.vercel.app",
  copyright: "mimifuwacc , marron.",
  messages: {
    q1: "あなたは未来大生ですか？",
    q2: "あなたは男性ですか？",
    errorNotStudent: "エラー: 未来大生以外はご利用いただけません",
    noMatch: "あなたにマッチする人は見つかりませんでした"
  },
  hiddenCommands: {
    ping: "pong",
    sudo: "Permission denied.",
    "sudo start": "管理者権限で実行したってマッチングしませんよ",
    fun: "Very fun",
    repo: "https://github.com/otoneko1102/fun-matching",
    ls: "utopia_profile.json",
    "cat utopia_profile.json": JSON.stringify(utopiaProfile, null, 2),
    neko: "nyaa",
    author: "https://github.com/otoneko1102",
    "810": "Dirty request."
  },
  inspiredBy: {
    label: "電通大生専用マッチングアプリ",
    url: "https://uec-matching.mimifuwacc.workers.dev/"
  }
};

config.hiddenCommands.help = `All commands: ${["start", ...Object.keys(config.hiddenCommands)]}`;

export default config;
