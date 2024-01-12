import axios from "axios"
import { Socket } from "socket.io-client";
import Cookies from 'universal-cookie';



class AuthService {
	api = axios.create({withCredentials:true})

	async get(uri: string) {
		let retry: boolean = true
		try {
			const res: any = await this.api.get(uri,{ headers: {'Authorization': 'Bearer ' + this.getAccessToken()}})
			return res
	 	} catch(err) {
			if (err.response?.status == 401 && retry) {
				retry = false
				try {
					await this.refresh()
					const res: any = await this.api.get(uri,{ headers: {Authorization: 'Bearer ' + this.getAccessToken()}})
					return res
				} catch (err) {
					throw err
				}
			} 
			throw err
		}
	}

	async postForm(uri: string, params: any) {
		let retry: boolean = true
		try {
			const res: any = await this.api.post(uri, params, {headers: {
				Authorization: 'Bearer ' + this.getAccessToken(),
				'Content-Type': 'multipart/form-data'
			}})
			return res
	 	} catch(err) {
			if (err.response?.status == 401 && retry) {
				retry = false
				try {
					await this.refresh()
					const res: any = await this.api.post(uri, params, {headers: {
						Authorization: 'Bearer ' + this.getAccessToken(),
						'Content-Type': 'multipart/form-data'
					}})
					return res
				} catch (err) {
					throw err
				}
			}
			throw err
		}
	}

	async post(uri: string, params: any) {
		let retry: boolean = true
		try {
			const res: any = await this.api.post(uri, params, {headers: {
				Authorization: 'Bearer ' + this.getAccessToken(),
			}})
			return res
	 	} catch(err) {
			if (err.response?.status == 401 && retry) {
				retry = false
				try {
					await this.refresh()
					const res: any = await this.api.post(uri, params, {headers: {
						Authorization: 'Bearer ' + this.getAccessToken(),
					}})
					return res
				} catch (err) {
					throw err
				}
			}
			throw err
		}
	}

	async patch(uri: string, params: any) {
		let retry: boolean = true
		try {
			const res: any = await this.api.patch(uri, params, {headers: {
				Authorization: 'Bearer ' + this.getAccessToken(),
			}})
			return res
	 	} catch(err) {
			if (err.response?.status == 401 && retry) {
				retry = false
				try {
					await this.refresh()
					const res: any = await this.api.patch(uri, params, {headers: {
						Authorization: 'Bearer ' + this.getAccessToken(),
					}})
					return res
				} catch (err) {
					throw err
				}
			}
			throw err
		}
	}

	async logout(isTwoFactorAuthenticated: boolean, gameSock : Socket) {
		const cookies = new Cookies()
		const url = isTwoFactorAuthenticated ? `${process.env.REACT_APP_SERVER_URL}/auth/2fa/logout` : `${process.env.REACT_APP_SERVER_URL}/auth/logout`
		try {
			
			const res:any = await this.post(url, {})
			gameSock?.emit('logout');
			cookies.remove("accessToken")
			cookies.remove("refreshToken")
			return res.status
		} catch(err:any) {
			throw err
		}
	}


	async refresh() {
		try {
			const res:any = await this.api.get(`${process.env.REACT_APP_SERVER_URL}/auth/refresh`)
			return res
		} catch(err:any) {
			throw err
		}
	}


	getAccessToken() {
		const accessToken = new Cookies().get("accessToken")
		return accessToken
	}

	getAuthHeader() {
		const accessToken = this.getAccessToken()
		return { 'Authorization': 'Bearer ' + accessToken}
	}

	async validate() {
		try {
			const res: any  = await this.get(`${process.env.REACT_APP_SERVER_URL}/auth/validate`)
			return res
		} catch(err) {
			throw err
		}
	}

	async register(data:any) {
		try {
			let res: any = await this.postForm(`${process.env.REACT_APP_SERVER_URL}/auth/register`, data)
			return res.status
		} catch(err) {
			throw err
		}
	}

	async twoFactorAuthenticationLogin(data:any) {
		try {
			let res: any = await this.post(`${process.env.REACT_APP_SERVER_URL}/auth/2fa/login`, {twoFactorAuthenticationCode:data})
			return res.status
		} catch(err) {
			throw err
		}
	}

	async twoFactorAuthenticationGenerate() {
		try {
			let res: any = await this.get(`${process.env.REACT_APP_SERVER_URL}/auth/2fa/generate`)
			return res
		} catch(err) {
			throw err
		}
	}

	async twoFactorAuthenticationTurnOn(data:any) {
		try {
			let res: any = await this.post(`${process.env.REACT_APP_SERVER_URL}/auth/2fa/turn-on`, data)
			return res
		} catch(err) {
			throw err
		}
	}

	async twoFactorAuthenticationTurnOff(data:any) {
		try {
			let res: any = await this.post(`${process.env.REACT_APP_SERVER_URL}/auth/2fa/turn-off`, data)
			return res
		} catch(err) {
			throw err
		}
	}
}

export default new AuthService()