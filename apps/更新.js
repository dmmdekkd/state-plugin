import { execSync } from 'child_process';
import path from 'path';
import { update } from '../../other/update.js';

export class StateUpdatePlugin extends plugin {
  constructor() {
    super({
      name: 'state-plugin管理',
      dsc: 'state-plugin管理',
      event: 'message',
      priority: 666666,
      rule: [
        {
          reg: /^#?(state|sp)(插件)?(强制)?更新?$/i,
          fnc: 'updatePlugin',
          permission: 'master'
        }
      ]
    });

    this.Plugin_Name = 'state-plugin';
    this.Plugin_Path = path.resolve(process.cwd(), 'plugins', this.Plugin_Name);
  }

  /** 更新插件（修复更新后自动重启） */
  async updatePlugin() {
    const updater = new update();
    updater.e = this.e;
    updater.reply = this.reply;

    if (!updater.getPlugin(this.Plugin_Name)) return;

    try {
      // 强制重置
      if (this.e.msg.includes('强制')) {
        execSync('git reset --hard', { cwd: this.Plugin_Path });
      }

      // 保证分支与远程同步
      execSync(`git branch --set-upstream-to=origin/main main`, {
        cwd: this.Plugin_Path,
        stdio: 'ignore'
      });

      // 执行更新
      await updater.runUpdate(this.Plugin_Name);

      // ✅ 修复：更新后自动重启
      if (updater.isUp) {
        logger.mark(`[state-plugin] ${this.Plugin_Name} 更新完成，准备重启插件...`);
        setTimeout(() => updater.restart(), 1000); // 延迟 1 秒安全重启
      } else {
        await this.e.reply('插件已经是最新版本，无需更新。');
      }
    } catch (err) {
      logger.error('state-plugin更新失败', err);
      await this.e.reply('更新失败，请查看日志。');
    }
  }
}
