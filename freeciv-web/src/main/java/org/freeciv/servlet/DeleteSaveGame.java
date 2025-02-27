/*******************************************************************************
 * Freeciv-web - the web version of Freeciv. http://www.fciv.net/
 * Copyright (C) 2009-2017 The Freeciv-web project
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *******************************************************************************/
package org.freeciv.servlet;

import org.apache.commons.codec.digest.Crypt;

import java.io.*;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.sql.DataSource;

import org.apache.commons.codec.digest.DigestUtils;
import org.freeciv.services.Validation;
import org.freeciv.util.Constants;

/**
 * Deletes a savegame.
 *
 * URL: /deletesavegame
 */
public class DeleteSaveGame extends HttpServlet {
	
	private static final long serialVersionUID = 1L;

	private final Validation validation = new Validation();
	
	private String savegameDirectory;

	public void init(ServletConfig config) throws ServletException {
		super.init(config);

		try {
			Properties prop = new Properties();
			prop.load(getServletContext().getResourceAsStream("/WEB-INF/config.properties"));
			savegameDirectory = prop.getProperty("savegame_dir");
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {

		String username = request.getParameter("username");
		String savegame = request.getParameter("savegame");
		String secure_password = java.net.URLDecoder.decode(request.getParameter("sha_password"), "UTF-8");

		if (!validation.isValidUsername(username)) {
			response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
					"Invalid username");
			return;
		}
		if (savegame == null || savegame.length() > 100 || savegame.contains("/") || savegame.contains("\\") || savegame.contains(".")) {
			response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
					"Invalid savegame");
			return;
		}

		Connection conn = null;
		try {
			Context env = (Context) (new InitialContext().lookup(Constants.JNDI_CONNECTION));
			DataSource ds = (DataSource) env.lookup(Constants.JNDI_DDBBCON_MYSQL);
			conn = ds.getConnection();

			// Salted, hashed password.
			String saltHashQuery =
					"SELECT secure_hashed_password "
							+ "FROM auth "
							+ "WHERE LOWER(username) = LOWER(?) "
							+ "	AND activated = '1' LIMIT 1";
			PreparedStatement ps1 = conn.prepareStatement(saltHashQuery);
			ps1.setString(1, username);
			ResultSet rs1 = ps1.executeQuery();
			if (!rs1.next()) {
				response.getOutputStream().print("Failed");
				return;
			} else {
				String hashedPasswordFromDB = rs1.getString(1);
				if (hashedPasswordFromDB != null &&
						hashedPasswordFromDB.equals(DigestUtils.sha256Hex(secure_password))) {
					// Login OK!
				} else {
					response.getOutputStream().print("Failed");
					return;
				}
			}

		} catch (Exception err) {
			response.setHeader("result", "error");
			err.printStackTrace();
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unable to login");
		} finally {
			if (conn != null)
				try {
					conn.close();
				} catch (SQLException e) {
					e.printStackTrace();
				}
		}

		try {
			File folder = new File(savegameDirectory + "/" + username);
			if (!folder.exists()) {
				response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
						"Save folder under the given username cannot be found.");
				return;
			} 
			boolean fileFound = false;
			for (File savegameFile: folder.listFiles()) {
				if (savegameFile.exists() && savegameFile.isFile()) {
					if (savegame.equals("ALL") || savegameFile.getName().startsWith(savegame)){
						// NOTE: the server does not distinguish saved games of different extensions when loading. So we can delete all of them.
						Files.delete(savegameFile.toPath());
						fileFound = true;
					}
				}
			}
			if (!fileFound) {
				response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
						"Saved game not found.");
				return;
			}
		} catch (Exception err) {
			response.setHeader("result", "error");
			err.printStackTrace();
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "ERROR");
		}

	}

	public void doGet(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {

		response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED, "This endpoint only supports the POST method.");

	}

}